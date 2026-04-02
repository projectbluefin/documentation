import React, { useState, useMemo, useEffect } from "react";
import firehoseData from "@site/static/data/firehose-apps.json";
import bluefinReleasesData from "@site/static/feeds/bluefin-releases.json";
import bluefinLtsReleasesData from "@site/static/feeds/bluefin-lts-releases.json";
import type { FirehoseApp, FirehoseRelease, FirehoseFilterState } from "../types/firehose";
import type { OsReleaseEvent, AppTimelineEvent } from "../types/os-feed";
import { parseOsRelease } from "../utils/parseOsRelease";
import FirehoseCard from "./FirehoseCard";
import OsReleaseCard from "./OsReleaseCard";
import FirehoseFilters from "./FirehoseFilters";
import styles from "./FirehoseFeed.module.css";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_MS: Record<string, number> = {
  "1d": 1 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

/** A single release event flattened out of its parent app. */
export interface FlatRelease {
  app: FirehoseApp;
  release: FirehoseRelease;
  dateMs: number;
}

// ── OS release events (parsed once at module scope) ───────────────────────────

function loadOsEvents(
  feedData: typeof bluefinReleasesData,
  stream: "stable" | "lts",
): OsReleaseEvent[] {
  const events: OsReleaseEvent[] = [];
  for (const item of feedData.items ?? []) {
    const release = parseOsRelease(item, stream);
    if (!release) continue; // GTS entry or parse failure — skip
    const dateMs = new Date(item.pubDate).getTime();
    if (isNaN(dateMs)) continue;
    events.push({ kind: "os", stream, dateMs, release });
  }
  return events;
}

const STABLE_OS_EVENTS: OsReleaseEvent[] = loadOsEvents(bluefinReleasesData, "stable");
const LTS_OS_EVENTS: OsReleaseEvent[] = loadOsEvents(bluefinLtsReleasesData, "lts");
const ALL_OS_EVENTS: OsReleaseEvent[] = [
  // Most recent stable release only
  ...(STABLE_OS_EVENTS.length > 0 ? [STABLE_OS_EVENTS[0]] : []),
  // Most recent LTS release only
  ...(LTS_OS_EVENTS.length > 0 ? [LTS_OS_EVENTS[0]] : []),
].sort((a, b) => b.dateMs - a.dateMs);

/**
 * Flatten every app's releases array into individual events.
 * Releases with no parseable date are silently dropped.
 * Result is sorted newest-first.
 */
function flattenReleases(apps: FirehoseApp[]): FlatRelease[] {
  const events: FlatRelease[] = [];
  for (const app of apps) {
    const releases = app.releases;
    if (!releases || releases.length === 0) continue;
    for (const release of releases) {
      const dateMs = new Date(release.date).getTime();
      if (isNaN(dateMs)) continue;
      events.push({ app, release, dateMs });
    }
  }
  events.sort((a, b) => b.dateMs - a.dateMs);
  return events;
}

function applyFilters(events: FlatRelease[], f: FirehoseFilterState): FlatRelease[] {
  const now = Date.now();
  return events.filter(({ app, dateMs }) => {
    if (f.verifiedOnly && !app.isVerified) return false;
    if (f.unverifiedOnly && app.isVerified) return false;
    if (f.packageType !== "all" && app.packageType !== f.packageType) return false;
    if (f.appSet !== "all" && app.appSet !== f.appSet) return false;
    if (f.category !== "all") {
      if (!app.categories || !app.categories.includes(f.category)) return false;
    }
    if (f.updatedWithin !== "all") {
      const maxAge = DAYS_MS[f.updatedWithin];
      if (now - dateMs > maxAge) return false;
    }
    return true;
  });
}

/** Unique apps derived from a flat event stream, one entry per app (first = most recent). */
export interface UniqueApp {
  app: FirehoseApp;
  latestMs: number;
}

/** Deduplicate a flat event stream to one entry per app (first occurrence = most recent release). */
export function toUniqueApps(events: FlatRelease[]): UniqueApp[] {
  const seen = new Set<string>();
  const result: UniqueApp[] = [];
  for (const { app, dateMs } of events) {
    if (!seen.has(app.id)) {
      seen.add(app.id);
      result.push({ app, latestMs: dateMs });
    }
  }
  return result;
}

/**
 * Deterministic daily featured app.
 * Uses a date-based seed so the selection is consistent within a day but
 * does NOT use Math.random() (which would cause SSR hydration mismatch).
 *
 * Eligible: flatpak with at least one valid release, installsLastMonth > 1000,
 * most-recent release within 90 days.
 * Falls back to all flatpaks with at least one valid release if no eligible app found.
 */
function getFeaturedApp(uniqueApps: UniqueApp[]): FirehoseApp | null {
  if (uniqueApps.length === 0) return null;

  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  let eligible = uniqueApps.filter(
    ({ app, latestMs }) =>
      app.packageType === "flatpak" &&
      (app.installsLastMonth ?? 0) > 1000 &&
      now - latestMs < ninetyDaysMs,
  );

  if (eligible.length === 0) {
    eligible = uniqueApps.filter(({ app }) => app.packageType === "flatpak");
  }

  if (eligible.length === 0) return null;

  // Deterministic hash from today's date string
  const dateKey = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) & 0xffffffff;
  }
  const idx = Math.abs(hash) % eligible.length;
  return eligible[idx].app;
}

// ── Statistics panel ──────────────────────────────────────────────────────────

function Statistics({
  uniqueApps,
  osEventCount,
}: {
  uniqueApps: UniqueApp[];
  osEventCount: number;
}) {
  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const { app } of uniqueApps) {
      byType[app.packageType] = (byType[app.packageType] ?? 0) + 1;
    }
    return byType;
  }, [uniqueApps]);

  return (
    <section className={styles.statsPanel}>
      <h3 className={styles.sidebarHeading}>Statistics</h3>
      <dl className={styles.statsList}>
        <dt>Total apps</dt>
        <dd>{uniqueApps.length}</dd>
        {Object.entries(counts).map(([type, count]) => (
          <React.Fragment key={type}>
            <dt>{type === "flatpak" ? "Flathub" : type === "homebrew" ? "Homebrew" : "OS Release"}</dt>
            <dd>{count}</dd>
          </React.Fragment>
        ))}
        {osEventCount > 0 && (
          <>
            <dt>OS Releases</dt>
            <dd>{osEventCount}</dd>
          </>
        )}
      </dl>
    </section>
  );
}

// ── Featured App Banner ───────────────────────────────────────────────────────

function FeaturedAppBanner({ app }: { app: FirehoseApp }) {
  const href = app.flathubUrl ?? app.sourceRepo?.url;

  return (
    <div className={styles.featuredBanner}>
      <div className={styles.featuredLabel}>
        <span className={styles.starIcon}>⭐</span>
        <span>Featured Today</span>
      </div>
      <a
        href={href ?? "#"}
        target={href ? "_blank" : undefined}
        rel="noopener noreferrer"
        className={styles.featuredContent}
        aria-label={`View ${app.name}`}
      >
        <div className={styles.featuredAppInfo}>
          {app.icon && (
            <img
              src={app.icon}
              alt={app.name}
              className={styles.featuredIcon}
              width={48}
              height={48}
              loading="lazy"
            />
          )}
          <div className={styles.featuredText}>
            <div className={styles.featuredName}>{app.name}</div>
            {app.summary && (
              <p className={styles.featuredSummary}>{app.summary}</p>
            )}
          </div>
        </div>
        <button className={styles.featuredCta} type="button">
          View App <span className={styles.arrow}>→</span>
        </button>
      </a>
    </div>
  );
}

// ── RSS Links ─────────────────────────────────────────────────────────────────

function RssLinks() {
  return (
    <section className={styles.rssSection}>
      <h3 className={styles.sidebarHeading}>Subscribe</h3>
      <ul className={styles.rssList}>
        <li>
          <a href="https://docs.projectbluefin.io/blog/rss.xml" target="_blank" rel="noopener noreferrer">
            Blog RSS
          </a>
        </li>
        <li>
          <a href="https://github.com/ublue-os/bluefin/releases.atom" target="_blank" rel="noopener noreferrer">
            Releases Atom
          </a>
        </li>
        <li>
          <a href="https://github.com/ublue-os/bluefin-lts/releases.atom" target="_blank" rel="noopener noreferrer">
            LTS Releases Atom
          </a>
        </li>
        <li>
          <a href="https://github.com/ublue-os/bluefin/discussions.atom" target="_blank" rel="noopener noreferrer">
            Discussions Atom
          </a>
        </li>
      </ul>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FirehoseFilterState = {
  packageType: "all",
  category: "all",
  appSet: "all",
  updatedWithin: "all",
  verifiedOnly: false,
  unverifiedOnly: false,
  showOsReleases: true,
};

const FirehoseFeed: React.FC = () => {
  const [filters, setFilters] = useState<FirehoseFilterState>(DEFAULT_FILTERS);

  // ── App events ──────────────────────────────────────────────────────────────

  const allEvents: FlatRelease[] = useMemo(
    () => flattenReleases(firehoseData.apps ?? []),
    [],
  );

  const filteredEvents = useMemo(() => applyFilters(allEvents, filters), [allEvents, filters]);

  const uniqueApps: UniqueApp[] = useMemo(() => toUniqueApps(allEvents), [allEvents]);

  const filteredUniqueApps: UniqueApp[] = useMemo(
    () => toUniqueApps(filteredEvents),
    [filteredEvents],
  );

  const [featuredApp, setFeaturedApp] = useState<FirehoseApp | null>(null);

  useEffect(() => {
    setFeaturedApp(getFeaturedApp(uniqueApps));
  }, [uniqueApps]);

  // ── OS release events ───────────────────────────────────────────────────────

  const filteredOsEvents = useMemo((): OsReleaseEvent[] => {
    if (!filters.showOsReleases) return [];
    if (filters.updatedWithin === "all") return ALL_OS_EVENTS;
    const maxAge = DAYS_MS[filters.updatedWithin];
    const now = Date.now();
    return ALL_OS_EVENTS.filter((e) => now - e.dateMs <= maxAge);
  }, [filters.showOsReleases, filters.updatedWithin]);

  // How many OS events are hidden by the date filter (for inline notice)
  const hiddenOsCount = useMemo(
    () =>
      filters.showOsReleases && filters.updatedWithin !== "all"
        ? ALL_OS_EVENTS.length - filteredOsEvents.length
        : 0,
    [filteredOsEvents, filters.showOsReleases, filters.updatedWithin],
  );

  // ── Grouped sections ───────────────────────────────────────────────────────
  //
  // OS releases are pinned as the featured section. App updates follow as a
  // secondary section, separated by a visual divider. Each section is sorted
  // by date independently.

  const osSection = filteredOsEvents; // already sorted by dateMs desc
  const appSection = filteredUniqueApps
    .map(({ app, latestMs }): AppTimelineEvent => ({ kind: "app", app, dateMs: latestMs }))
    .sort((a, b) => b.dateMs - a.dateMs);

  const isEmpty = allEvents.length === 0 && ALL_OS_EVENTS.length === 0;
  const feedEmpty = osSection.length === 0 && appSection.length === 0;

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebarColumn}>
        {/* More Information — pinned at very top */}
        <section className={styles.sidebarInfoLinks}>
          <h3 className={styles.sidebarHeading}>More Information</h3>
          <nav className={styles.sidebarQuickLinks}>
            <a href="/images" className={styles.sidebarQuickLink}>Images catalog →</a>
            <a href="/driver-versions" className={styles.sidebarQuickLink}>Driver versions →</a>
          </nav>
        </section>
        <RssLinks />
        {featuredApp && <FeaturedAppBanner app={featuredApp} />}
        <FirehoseFilters
          apps={uniqueApps.map(({ app }) => app)}
          filters={filters}
          onFiltersChange={setFilters}
          matchCount={filteredUniqueApps.length}
        />
        {!isEmpty && (
          <Statistics uniqueApps={uniqueApps} osEventCount={ALL_OS_EVENTS.length} />
        )}
      </aside>

      {/* ── Main feed ── */}
      <main className={styles.feedColumn}>
        {/* Inline notice when OS events are hidden by the date filter */}
        {hiddenOsCount > 0 && (
          <p className={styles.osHiddenNotice}>
            {hiddenOsCount} OS release{hiddenOsCount !== 1 ? "s" : ""} hidden by the
            date filter.{" "}
            <button
              className={styles.clearFiltersBtn}
              onClick={() => setFilters({ ...filters, updatedWithin: "all" })}
            >
              Show all
            </button>
          </p>
        )}

        {isEmpty ? (
          <div className={styles.emptyState}>
            <p>
              App release data is not available yet. The{" "}
              <a
                href="https://castrojo.github.io/bluefin-releases/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Bluefin Firehose
              </a>{" "}
              pipeline runs every 6 hours — check back soon.
            </p>
          </div>
        ) : feedEmpty ? (
          <div className={styles.emptyState}>
            <p>No items match the current filters.</p>
            <button
              className={styles.clearFiltersBtn}
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* ── OS Releases — featured section ── */}
            {osSection.length > 0 && (
              <section className={styles.feedSection}>
                <h2 className={styles.feedSectionHeading}>Bluefin OS Releases</h2>
                {osSection.map((event) => (
                  <OsReleaseCard key={`os-${event.release.tag}`} event={event} />
                ))}
              </section>
            )}

            {/* ── App Updates — secondary section ── */}
            {appSection.length > 0 && (
              <section className={styles.feedSection}>
                <div className={styles.appSectionDivider}>
                  <h2 className={styles.feedSectionHeading}>App Updates</h2>
                  <span className={styles.appSectionHint}>
                    Flatpak &amp; Homebrew packages included in Bluefin
                  </span>
                </div>
                {appSection.map((event) => (
                  <FirehoseCard key={event.app.id} app={event.app} />
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default FirehoseFeed;
