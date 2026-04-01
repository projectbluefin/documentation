import React, { useState, useMemo } from "react";
import firehoseData from "@site/static/data/firehose-apps.json";
import type { FirehoseApp, FirehoseRelease, FirehoseFilterState } from "../types/firehose";
import FirehoseCard from "./FirehoseCard";
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

function Statistics({ uniqueApps }: { uniqueApps: UniqueApp[] }) {
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
      </dl>
    </section>
  );
}

// ── Featured App Banner ───────────────────────────────────────────────────────

function FeaturedAppBanner({ app }: { app: FirehoseApp }) {
  return (
    <section className={styles.featuredBanner}>
      <h3 className={styles.sidebarHeading}>Featured Today</h3>
      <div className={styles.featuredCard}>
        {app.icon ? (
          <img
            src={app.icon}
            alt={app.name}
            className={styles.featuredIcon}
            width={40}
            height={40}
            loading="lazy"
          />
        ) : (
          <span className={styles.featuredIconEmoji}>🍺</span>
        )}
        <div>
          <div className={styles.featuredName}>
            {app.flathubUrl ? (
              <a href={app.flathubUrl} target="_blank" rel="noopener noreferrer">
                {app.name}
              </a>
            ) : (
              app.name
            )}
          </div>
          {app.summary && <p className={styles.featuredSummary}>{app.summary}</p>}
        </div>
      </div>
    </section>
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
};

const FirehoseFeed: React.FC = () => {
  const [filters, setFilters] = useState<FirehoseFilterState>(DEFAULT_FILTERS);

  const allEvents: FlatRelease[] = useMemo(
    () => flattenReleases(firehoseData.apps ?? []),
    [],
  );

  const filteredEvents = useMemo(() => applyFilters(allEvents, filters), [allEvents, filters]);

  // Single deduplication pass — shared by getFeaturedApp, Statistics, and FirehoseFilters
  const uniqueApps: UniqueApp[] = useMemo(() => toUniqueApps(allEvents), [allEvents]);

  const featuredApp = useMemo(() => getFeaturedApp(uniqueApps), [uniqueApps]);

  const isEmpty = allEvents.length === 0;

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebarColumn}>
        <RssLinks />
        {featuredApp && <FeaturedAppBanner app={featuredApp} />}
        <FirehoseFilters
          apps={uniqueApps.map(({ app }) => app)}
          filters={filters}
          onFiltersChange={setFilters}
          matchCount={filteredEvents.length}
        />
        {!isEmpty && <Statistics uniqueApps={uniqueApps} />}
      </aside>

      {/* ── Main feed ── */}
      <main className={styles.feedColumn}>
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
        ) : filteredEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No apps match the current filters.</p>
            <button
              className={styles.clearFiltersBtn}
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredEvents.map(({ app, release }) => (
            <FirehoseCard key={`${app.id}@${release.version}`} app={app} release={release} />
          ))
        )}
      </main>
    </div>
  );
};

export default FirehoseFeed;
