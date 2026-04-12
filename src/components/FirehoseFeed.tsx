import React, { useState, useMemo, useEffect } from "react";
import Heading from "@theme/Heading";
import firehoseData from "@site/static/data/firehose-apps.json";
import bluefinReleasesData from "@site/static/feeds/bluefin-releases.json";
import bluefinLtsReleasesData from "@site/static/feeds/bluefin-lts-releases.json";
import type { FirehoseApp, FirehoseRelease, FirehoseFilterState } from "../types/firehose";
import type { OsReleaseEvent, AppTimelineEvent, FlatTimelineEvent, ParsedMajorPackage } from "../types/os-feed";
import sbomAttestationsData from "@site/static/data/sbom-attestations-frontend.json";
import type { SbomAttestationsData, PackageVersions } from "../types/sbom";
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

/**
 * Parse all items from a feed into OsReleaseEvent[].
 * streamHint overrides per-item stream detection (used for LTS feed which lacks
 * stream-identifying prefixes on some historical entries).
 */
function loadOsEvents(
  feedData: typeof bluefinReleasesData,
  streamHint?: "lts",
): OsReleaseEvent[] {
  const events: OsReleaseEvent[] = [];
  for (const item of feedData.items ?? []) {
    const release = parseOsRelease(item, streamHint);
    if (!release) continue; // GTS entry or unrecognized format — skip
    const dateMs = new Date(item.pubDate).getTime();
    if (isNaN(dateMs)) continue;
    events.push({ kind: "os", stream: release.stream, dateMs, release });
  }
  return events;
}

// ── SBOM enrichment ───────────────────────────────────────────────────────────
//
// All package version chips on OS release cards are sourced from the SBOM
// attestation cache (Pipeline B — authoritative). Release notes data
// (majorPackages from the HTML/Markdown parser) is supplemented by SBOM
// but never used as the sole source for missing packages.
// Dakota is the only stream that uses hardcoded placeholder versions.

const SBOM_CACHE = sbomAttestationsData as unknown as SbomAttestationsData;

/** Map from lowercase HEADER_CHIP_NAMES to their PackageVersions field. */
const CHIP_TO_SBOM: Array<{ chipName: string; displayName: string; field: keyof PackageVersions }> = [
  { chipName: "kernel",   displayName: "Kernel",   field: "kernel" },
  { chipName: "gnome",    displayName: "Gnome",    field: "gnome" },
  { chipName: "mesa",     displayName: "Mesa",     field: "mesa" },
  { chipName: "podman",   displayName: "Podman",   field: "podman" },
  { chipName: "bootc",    displayName: "bootc",    field: "bootc" },
  { chipName: "systemd",  displayName: "systemd",  field: "systemd" },
  { chipName: "pipewire", displayName: "pipewire", field: "pipewire" },
  { chipName: "flatpak",  displayName: "flatpak",  field: "flatpak" },
];

/**
 * Convert a ParsedOsRelease tag + stream to the SBOM cache key + stream ID.
 *
 * release.tag is normalised by parseOsRelease (e.g. "stable-daily-20260331"),
 * but SBOM cacheKeys use the original GitHub release tag format ("stable-20260331").
 */
function sbomKeyForRelease(tag: string, stream: string): { streamId: string; cacheKey: string } | null {
  const dateMatch = tag.match(/(\d{8})/);
  if (!dateMatch) return null;
  const date = dateMatch[1];
  if (stream === "lts") return { streamId: "bluefin-lts", cacheKey: `lts-${date}` };
  if (stream === "stable-daily") return { streamId: "bluefin-stable-daily", cacheKey: `stable-daily-${date}` };
  if (stream === "stable") return { streamId: "bluefin-stable", cacheKey: `stable-${date}` };
  return null;
}

/**
 * Enrich each OS release event's majorPackages with versions from the SBOM cache.
 *
 * SBOM-primary policy: for every package SBOM tracks (CHIP_TO_SBOM), the SBOM
 * version is authoritative and overrides any version parsed from release notes.
 * prevVersion (the gold change-indicator arrow) is preserved from release notes
 * so the UI can still show what changed. Packages outside CHIP_TO_SBOM (Nvidia,
 * HWE Kernel, DX, GDX) are kept from release notes unchanged.
 *
 * Only applies to stable/LTS events. Dakota uses hardcoded placeholders.
 */
function enrichFromSbom(events: OsReleaseEvent[]): OsReleaseEvent[] {
  return events.map((event) => {
    const key = sbomKeyForRelease(event.release.tag, event.stream);
    if (!key) return event;

    const packages = SBOM_CACHE?.streams?.[key.streamId]?.releases?.[key.cacheKey]?.packageVersions;
    if (!packages) {
      // Expected during local dev (empty seed file) and for releases older than LOOKBACK_DAYS.
      // In CI with a populated SBOM cache this should be rare — check update-sbom-cache.yml if frequent.
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[SBOM] No cache entry for ${key.streamId}/${key.cacheKey} — using release notes`);
      }
      return event;
    }

    const sbomChipNames = new Set(CHIP_TO_SBOM.map(({ chipName }) => chipName));

    // Keep non-SBOM packages (Nvidia, HWE Kernel, DX, GDX, etc.) from release notes.
    const nonSbomPackages = event.release.majorPackages.filter(
      (p) => !sbomChipNames.has(p.name.toLowerCase())
    );

    // For SBOM-tracked packages: SBOM version is authoritative; fall back to
    // release notes version if SBOM has null (package not found in RPM database).
    // Preserves prevVersion from release notes so the change indicator (↑) works.
    const sbomPackages: ParsedMajorPackage[] = [];
    for (const { chipName, displayName, field } of CHIP_TO_SBOM) {
      const sbomVersion = packages[field] as string | null | undefined;
      const fromNotes = event.release.majorPackages.find(
        (p) => p.name.toLowerCase() === chipName
      );
      const version = sbomVersion ?? fromNotes?.version ?? null;
      if (!version) continue; // neither SBOM nor release notes has this package — omit chip
      sbomPackages.push({ name: displayName, version, prevVersion: fromNotes?.prevVersion ?? null });
    }

    if (sbomPackages.length === 0) return event;
    return {
      ...event,
      release: { ...event.release, majorPackages: [...sbomPackages, ...nonSbomPackages] },
    };
  });
}

/**
 * LTS has no SBOM pipeline. Carry forward package versions last seen in fullDiff
 * across the release history so each LTS card shows its most-recently-observed version.
 * Processes events oldest→newest, maintaining a running "last known" state per package,
 * then restores the original newest-first order.
 */
function enrichLtsFromHistory(events: OsReleaseEvent[]): OsReleaseEvent[] {
  const TRACKED = ["systemd", "bootc", "pipewire", "flatpak"];
  const sorted = [...events].sort((a, b) => a.dateMs - b.dateMs);
  const running: Record<string, string> = {};

  const enriched = sorted.map((event) => {
    // Update running state from majorPackages listed in release notes
    for (const pkg of event.release.majorPackages) {
      const lower = pkg.name.toLowerCase();
      if (TRACKED.includes(lower)) running[lower] = pkg.version;
    }
    // Update from fullDiff (packages that changed in this release)
    for (const entry of event.release.fullDiff) {
      const lower = entry.name.toLowerCase();
      if (TRACKED.includes(lower) && entry.newVersion) running[lower] = entry.newVersion;
    }

    const existingNames = new Set(event.release.majorPackages.map((p) => p.name.toLowerCase()));
    const toAdd: ParsedMajorPackage[] = [];
    for (const name of TRACKED) {
      if (!existingNames.has(name) && running[name]) {
        toAdd.push({ name, version: running[name], prevVersion: null });
      }
    }
    if (toAdd.length === 0) return event;
    return { ...event, release: { ...event.release, majorPackages: [...event.release.majorPackages, ...toAdd] } };
  });

  return enriched.sort((a, b) => b.dateMs - a.dateMs);
}

/**
 * Synthesise OsReleaseEvent entries for stable-daily builds that exist only in
 * GHCR (no GitHub Release). These are GHCR nightly builds tagged
 * "stable-daily-YYYYMMDD" — they never appear in bluefin-releases.json so they
 * would otherwise be invisible on the changelogs page.
 *
 * Package versions come directly from the SBOM cache so no enrichFromSbom pass
 * is needed; the events are already fully populated.
 */
function loadStableDailyEventsFromSbom(): OsReleaseEvent[] {
  const stream = SBOM_CACHE?.streams?.["bluefin-stable-daily"];
  if (!stream?.releases) return [];

  const events: OsReleaseEvent[] = [];
  for (const [cacheKey, releaseData] of Object.entries(stream.releases)) {
    if (!releaseData.packageVersions) continue;

    const dateMatch = cacheKey.match(/(\d{8})$/);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1];
    const dateMs = Date.parse(
      `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00Z`,
    );
    if (isNaN(dateMs)) continue;

    const packages = releaseData.packageVersions;
    const majorPackages: ParsedMajorPackage[] = [];
    for (const { chipName, displayName, field } of CHIP_TO_SBOM) {
      const version = packages[field] as string | null | undefined;
      if (!version) continue;
      majorPackages.push({ name: displayName, version, prevVersion: null });
    }
    if (majorPackages.length === 0) continue;

    events.push({
      kind: "os",
      stream: "stable-daily",
      dateMs,
      release: {
        stream: "stable-daily",
        tag: cacheKey,
        githubUrl: "https://github.com/orgs/ublue-os/packages/container/package/bluefin",
        fedoraVersion: packages.fedora ? packages.fedora.replace(/^F/, "") : null,
        centosVersion: null,
        majorPackages,
        dxPackages: [],
        gdxPackages: [],
        commits: [],
        fullDiff: [],
      },
    });
  }

  return events;
}

// All parsed events from both feeds, enriched with SBOM package versions
const BLUEFIN_OS_EVENTS: OsReleaseEvent[] = enrichFromSbom(loadOsEvents(bluefinReleasesData));
const STABLE_DAILY_OS_EVENTS: OsReleaseEvent[] = loadStableDailyEventsFromSbom();
const LTS_OS_EVENTS: OsReleaseEvent[] = enrichLtsFromHistory(enrichFromSbom(loadOsEvents(bluefinLtsReleasesData, "lts")));
const ALL_OS_STREAM_EVENTS: OsReleaseEvent[] = [
  ...BLUEFIN_OS_EVENTS,
  ...STABLE_DAILY_OS_EVENTS,
  ...LTS_OS_EVENTS,
].sort((a, b) => b.dateMs - a.dateMs);

// Dakota placeholder — upstream repo has no releases yet; versions sourced from
// BuildStream junction pins in ~/src/dakota/elements/*.bst (no SBOM pipeline).
// Update when junction refs change: freedesktop-sdk-25.08.8 + gnome-build-meta gnome-50
const DAKOTA_PLACEHOLDER_EVENT: OsReleaseEvent = {
  kind: "os",
  stream: "dakota",
  dateMs: 0, // no date — placeholder
  release: {
    stream: "dakota",
    tag: "dakota-alpha",
    githubUrl: "https://github.com/projectbluefin/dakota",
    fedoraVersion: null,
    centosVersion: null,
    majorPackages: [
      { name: "Kernel", version: "6.18.7", prevVersion: null },
      { name: "Gnome", version: "50.0", prevVersion: null },
      { name: "Mesa", version: "25.3.5", prevVersion: null },
      { name: "Podman", version: "5.8.0", prevVersion: null },
      { name: "bootc", version: "1.12.1", prevVersion: null },
      { name: "systemd", version: "259.2", prevVersion: null },
      { name: "pipewire", version: "1.6.1", prevVersion: null },
      { name: "sudo-rs", version: "74e0db4", prevVersion: null },
      { name: "uutils-coreutils", version: "e7f2fd9", prevVersion: null },
    ],
    dxPackages: [],
    gdxPackages: [],
    commits: [],
    fullDiff: [],
  },
};

// Pinned "Current Versions" cards: latest stable + latest LTS + Dakota placeholder.
// All bluefin releases are stable-daily; synthesise a "stable"-streamed clone for
// the pinned card so it shows the "Stable" badge while the stream shows "Daily".
const PINNED_OS_EVENTS: OsReleaseEvent[] = (() => {
  // Pinned Bluefin card: most recent weekly stable release (stream === "stable").
  // stable-daily builds (latest-YYYYMMDD, if published) appear in the timeline only.
  const pinnedStable: OsReleaseEvent | undefined =
    BLUEFIN_OS_EVENTS.find((e) => e.stream === "stable") ?? BLUEFIN_OS_EVENTS[0];
  // Pinned LTS card: latest from LTS feed
  const pinnedLts: OsReleaseEvent | undefined = LTS_OS_EVENTS.length > 0 ? LTS_OS_EVENTS[0] : undefined;
  return [pinnedStable, pinnedLts, DAKOTA_PLACEHOLDER_EVENT]
    .filter((e): e is OsReleaseEvent => e !== undefined);
})();

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
            <dt>OS Releases in stream</dt>
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
  showEverything: false,
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

  // ── OS stream events (filtered by date, always shown) ─────────────────────

  const filteredOsStreamEvents = useMemo((): OsReleaseEvent[] => {
    // When filtering to a specific app type, OS events are hidden
    if (filters.packageType === "flatpak" || filters.packageType === "homebrew") return [];
    if (filters.updatedWithin === "all") return ALL_OS_STREAM_EVENTS;
    const maxAge = DAYS_MS[filters.updatedWithin];
    const now = Date.now();
    return ALL_OS_STREAM_EVENTS.filter((e) => e.dateMs > 0 && now - e.dateMs <= maxAge);
  }, [filters.packageType, filters.updatedWithin]);

  // How many stream OS events are hidden by the date filter
  const hiddenOsCount = useMemo(
    () =>
      filters.updatedWithin !== "all" &&
      filters.packageType !== "flatpak" &&
      filters.packageType !== "homebrew"
        ? ALL_OS_STREAM_EVENTS.filter((e) => e.dateMs > 0).length - filteredOsStreamEvents.length
        : 0,
    [filteredOsStreamEvents, filters.packageType, filters.updatedWithin],
  );

  // ── Unified "Updates Stream" ───────────────────────────────────────────────
  //
  // OS releases are always primary. App entries (flatpak/homebrew) are shown
  // only when showEverything is true OR when a specific app type filter is active.

  const appSection = useMemo(
    () =>
      filteredUniqueApps
        .map(({ app, latestMs }): AppTimelineEvent => ({ kind: "app", app, dateMs: latestMs }))
        .sort((a, b) => b.dateMs - a.dateMs),
    [filteredUniqueApps],
  );

  // Apps appear when: showEverything is on, OR a specific app type is selected
  const showApps =
    filters.showEverything ||
    filters.packageType === "flatpak" ||
    filters.packageType === "homebrew";

  const unifiedStream = useMemo((): FlatTimelineEvent[] => {
    const items: FlatTimelineEvent[] = [];
    if (showApps) {
      items.push(...appSection);
    }
    items.push(...filteredOsStreamEvents);
    items.sort((a, b) => b.dateMs - a.dateMs);
    return items;
  }, [filteredOsStreamEvents, appSection, showApps]);

  const isEmpty = allEvents.length === 0 && ALL_OS_STREAM_EVENTS.length === 0;
  const feedEmpty = unifiedStream.length === 0;

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
          <Statistics uniqueApps={uniqueApps} osEventCount={ALL_OS_STREAM_EVENTS.length} />
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
        ) : (
          <>
            {/* ── Current Versions — pinned cards, always visible ── */}
            <section className={styles.feedSection}>
              <Heading as="h2" className={styles.feedSectionHeading}>Current Versions</Heading>
              {PINNED_OS_EVENTS.map((event) => (
                <OsReleaseCard key={`pinned-${event.release.tag}`} event={event} />
              ))}
            </section>

            {/* ── Updates Stream — unified chronological feed ── */}
            {feedEmpty ? (
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
              <section className={styles.feedSection}>
                <div className={styles.appSectionDivider}>
                  <Heading as="h2" className={styles.feedSectionHeading}>Updates Stream</Heading>
                  <span className={styles.appSectionHint}>
                    {showApps
                      ? "OS releases, Flatpak & Homebrew packages included in Bluefin"
                      : "OS releases · check \"Show Everything\" to include Flatpak & Homebrew"}
                  </span>
                </div>
                {unifiedStream.map((event) =>
                  event.kind === "os" ? (
                    <OsReleaseCard key={`stream-${event.release.tag}-${event.dateMs}`} event={event} />
                  ) : (
                    <div key={event.app.id} className={styles.appEntry}>
                      <FirehoseCard app={event.app} defaultCollapsed={true} />
                    </div>
                  ),
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default FirehoseFeed;
