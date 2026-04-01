import React, { useState, useMemo } from "react";
import firehoseData from "@site/static/data/firehose-apps.json";
import type { FirehoseApp, FirehoseFilterState } from "../types/firehose";
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

function applyFilters(apps: FirehoseApp[], f: FirehoseFilterState): FirehoseApp[] {
  const now = Date.now();
  return apps.filter((app) => {
    if (f.verifiedOnly && !app.isVerified) return false;
    if (f.unverifiedOnly && app.isVerified) return false;
    if (f.packageType !== "all" && app.packageType !== f.packageType) return false;
    if (f.appSet !== "all" && app.appSet !== f.appSet) return false;
    if (f.category !== "all") {
      if (!app.categories || !app.categories.includes(f.category)) return false;
    }
    if (f.updatedWithin !== "all") {
      const maxAge = DAYS_MS[f.updatedWithin];
      const age = now - new Date(app.updatedAt).getTime();
      if (age > maxAge) return false;
    }
    return true;
  });
}

/**
 * Deterministic daily featured app.
 * Uses a date-based seed so the selection is consistent within a day but
 * does NOT use Math.random() (which would cause SSR hydration mismatch).
 *
 * Eligible: flatpak, installsLastMonth > 1000, updated within 90 days.
 * Falls back to all flatpaks if no eligible app found.
 */
function getFeaturedApp(apps: FirehoseApp[]): FirehoseApp | null {
  if (apps.length === 0) return null;

  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  let eligible = apps.filter(
    (a) =>
      a.packageType === "flatpak" &&
      (a.installsLastMonth ?? 0) > 1000 &&
      now - new Date(a.updatedAt).getTime() < ninetyDaysMs,
  );

  if (eligible.length === 0) {
    eligible = apps.filter((a) => a.packageType === "flatpak");
  }

  if (eligible.length === 0) return null;

  // Deterministic hash from today's date string
  const dateKey = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) & 0xffffffff;
  }
  const idx = Math.abs(hash) % eligible.length;
  return eligible[idx];
}

// ── Statistics panel ──────────────────────────────────────────────────────────

function Statistics({ apps }: { apps: FirehoseApp[] }) {
  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const a of apps) {
      byType[a.packageType] = (byType[a.packageType] ?? 0) + 1;
    }
    return byType;
  }, [apps]);

  return (
    <section className={styles.statsPanel}>
      <h3 className={styles.sidebarHeading}>Statistics</h3>
      <dl className={styles.statsList}>
        <dt>Total apps</dt>
        <dd>{apps.length}</dd>
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

  const allApps: FirehoseApp[] = useMemo(
    () =>
      [...(firehoseData.apps ?? [])].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [],
  );

  const filteredApps = useMemo(() => applyFilters(allApps, filters), [allApps, filters]);

  const featuredApp = useMemo(() => getFeaturedApp(allApps), [allApps]);

  const isEmpty = allApps.length === 0;

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebarColumn}>
        <RssLinks />
        {featuredApp && <FeaturedAppBanner app={featuredApp} />}
        <FirehoseFilters
          apps={allApps}
          filters={filters}
          onFiltersChange={setFilters}
          matchCount={filteredApps.length}
        />
        {!isEmpty && <Statistics apps={allApps} />}
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
        ) : filteredApps.length === 0 ? (
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
          filteredApps.map((app) => <FirehoseCard key={app.id} app={app} />)
        )}
      </main>
    </div>
  );
};

export default FirehoseFeed;
