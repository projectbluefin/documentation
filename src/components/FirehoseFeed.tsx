import React, { useState, useMemo, useEffect } from "react";
import Heading from "@theme/Heading";
import firehoseData from "@site/static/data/firehose-apps.json";
import type { FirehoseApp, FirehoseRelease, FirehoseFilterState } from "../types/firehose";
import type { OsReleaseEvent, AppTimelineEvent, FlatTimelineEvent, ParsedMajorPackage, OsStream, OsFeedItem } from "../types/os-feed";
import type { SbomAttestationsData, PackageVersions } from "../types/sbom";
import { parseOsRelease } from "../utils/parseOsRelease";
import {
  DAYS_MS,
  ROLLING_WINDOW_MS,
  CHIP_TO_SBOM,
  DX_CHIP_MAP,
  GDX_CHIP_MAP,
  sbomKeyForRelease,
  buildVersionChips,
  sbomStreamToEvents,
} from "../utils/firehoseHelpers";
import FirehoseCard from "./FirehoseCard";
import OsReleaseCard from "./OsReleaseCard";
import FirehoseFilters from "./FirehoseFilters";
import styles from "./FirehoseFeed.module.css";

// ── Lazy-loaded feed data ────────────────────────────────────────────────────
// Defers 1.4MB of JSON parsing from module-load time to first access.

let _bluefinReleasesData: { items?: OsFeedItem[] } | null = null;
function getBluefinReleasesData() {
  if (!_bluefinReleasesData) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _bluefinReleasesData = require("@site/static/feeds/bluefin-releases.json");
  }
  return _bluefinReleasesData!;
}

let _bluefinLtsReleasesData: { items?: OsFeedItem[] } | null = null;
function getBluefinLtsReleasesData() {
  if (!_bluefinLtsReleasesData) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _bluefinLtsReleasesData = require("@site/static/feeds/bluefin-lts-releases.json");
  }
  return _bluefinLtsReleasesData!;
}

/** A single release event flattened out of its parent app. */
export interface FlatRelease {
  app: FirehoseApp;
  release: FirehoseRelease;
  dateMs: number;
}

// ── OS release events ─────────────────────────────────────────────────────────

function loadOsEvents(
  feedData: { items?: OsFeedItem[] },
  streamHint?: "lts",
): OsReleaseEvent[] {
  const events: OsReleaseEvent[] = [];
  for (const item of feedData.items ?? []) {
    const release = parseOsRelease(item, streamHint);
    if (!release) continue;
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

// Lazy-loaded SBOM cache: the 104KB JSON is only parsed on first access,
// deferring work from module-load time to first render.
let _sbomCache: SbomAttestationsData | null = null;
function getSbomCache(): SbomAttestationsData {
  if (!_sbomCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _sbomCache = require("@site/static/data/sbom-attestations-frontend.json") as SbomAttestationsData;
  }
  return _sbomCache;
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

    const packages = getSbomCache()?.streams?.[key.streamId]?.releases?.[key.cacheKey]?.packageVersions;
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
    // Priority: majorPackages prevVersion (2-col table) → fullDiff prevVersion (4-col diff table).
    // fullDiff is checked because SBOM-tracked packages (e.g. bootc) often appear in the
    // "All Images" diff table but NOT in the "Major packages" 2-col table, so fromNotes is
    // undefined and prevVersion would silently become null without the fullDiff fallback.
    const sbomPackages: ParsedMajorPackage[] = [];
    for (const { chipName, displayName, field } of CHIP_TO_SBOM) {
      const sbomVersion = packages[field] as string | null | undefined;
      const fromNotes = event.release.majorPackages.find(
        (p) => p.name.toLowerCase() === chipName
      );
      const fromDiff = event.release.fullDiff.find(
        (d) => d.name.toLowerCase() === chipName
      );
      const version = sbomVersion ?? fromNotes?.version ?? null;
      if (!version) continue; // neither SBOM nor release notes has this package — omit chip
      const prevVersion = fromNotes?.prevVersion ?? fromDiff?.prevVersion ?? null;
      sbomPackages.push({ name: displayName, version, prevVersion });
    }

    if (sbomPackages.length === 0) return event;
    return {
      ...event,
      release: { ...event.release, majorPackages: [...sbomPackages, ...nonSbomPackages] },
    };
  });
}

/**
 * Carry forward package versions last seen in fullDiff across the LTS release
 * history so each card shows its most-recently-observed version for packages
 * not tracked by the primary SBOM path (e.g. releases older than LOOKBACK_DAYS,
 * or packages SBOM tracks but release notes also list).
 *
 * Primary SBOM pipeline (enrichFromSbom) handles Kernel, GNOME, Mesa, Podman,
 * bootc, systemd, pipewire, flatpak for releases within LOOKBACK_DAYS.
 * This function is a fallback for older releases and carries forward the same
 * TRACKED set from the release notes / fullDiff parser.
 *
 * Processes events oldest→newest, maintaining a running "last known" state,
 * then restores the original newest-first order.
 */
function enrichLtsFromHistory(events: OsReleaseEvent[]): OsReleaseEvent[] {
  const TRACKED = ["systemd", "bootc", "pipewire", "flatpak", "hwe kernel"];
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
 * Enrich LTS events' dxPackages and gdxPackages from the bluefin-dx-lts /
 * bluefin-gdx-lts SBOM allPackages maps.
 *
 * The "Major DX / GDX packages" tables are absent from lts.YYYYMMDD releases
 * (new release format), so dxPackages/gdxPackages are empty after parse.
 * This function fills them from authoritative SBOM data.
 */
function enrichLtsDxGdxFromSbom(events: OsReleaseEvent[]): OsReleaseEvent[] {
  return events.map((event) => {
    if (event.stream !== "lts") return event;

    const dateMatch = event.release.tag.match(/(\d{8})/);
    if (!dateMatch) return event;
    const cacheKey = `lts-${dateMatch[1]}`;

    const dxAllPkgs =
      getSbomCache()?.streams?.["bluefin-dx-lts"]?.releases?.[cacheKey]?.packageVersions?.allPackages;
    const gdxAllPkgs =
      getSbomCache()?.streams?.["bluefin-gdx-lts"]?.releases?.[cacheKey]?.packageVersions?.allPackages;

    const dxPackages = [...event.release.dxPackages];
    if (dxAllPkgs) {
      const existing = new Set(dxPackages.map((p) => p.name.toLowerCase()));
      for (const [rpm, label] of Object.entries(DX_CHIP_MAP)) {
        const version = dxAllPkgs[rpm];
        if (version && !existing.has(label.toLowerCase())) {
          dxPackages.push({ name: label, version, prevVersion: null });
        }
      }
    }

    const gdxPackages = [...event.release.gdxPackages];
    if (gdxAllPkgs) {
      const existing = new Set(gdxPackages.map((p) => p.name.toLowerCase()));
      for (const [rpm, label] of Object.entries(GDX_CHIP_MAP)) {
        const version = gdxAllPkgs[rpm];
        if (version && !existing.has(label.toLowerCase())) {
          gdxPackages.push({ name: label, version, prevVersion: null });
        }
      }
    }

    if (
      dxPackages.length === event.release.dxPackages.length &&
      gdxPackages.length === event.release.gdxPackages.length
    ) {
      return event;
    }
    return { ...event, release: { ...event.release, dxPackages, gdxPackages } };
  });
}

/**
 * Override the "HWE Kernel" carry-forward value in LTS events with the
 * authoritative version from the bluefin-lts-hwe SBOM stream.
 *
 * enrichLtsFromHistory carries "hwe kernel" forward from release notes, but
 * LTS release notes have not included HWE Kernel since lts.20251223, causing
 * the changelogs page to display a stale value. The SBOM stream always has the
 * correct installed version.
 */
function enrichLtsHweKernelFromSbom(events: OsReleaseEvent[]): OsReleaseEvent[] {
  return events.map((event) => {
    if (event.stream !== "lts") return event;

    const dateMatch = event.release.tag.match(/(\d{8})/);
    if (!dateMatch) return event;
    const hweKernel =
      getSbomCache()?.streams?.["bluefin-lts-hwe"]?.releases?.[`lts-hwe-${dateMatch[1]}`]
        ?.packageVersions?.kernel;
    if (!hweKernel) return event;

    const updatedPackages = event.release.majorPackages.map((pkg) =>
      pkg.name.toLowerCase() === "hwe kernel" ? { ...pkg, version: hweKernel } : pkg,
    );
    return { ...event, release: { ...event.release, majorPackages: updatedPackages } };
  });
}

// ── Lazy-initialized derived data ─────────────────────────────────────────────
// All enrichment pipelines run on first access rather than at module load time.

let _bluefinOsEvents: OsReleaseEvent[] | null = null;
function getBluefinOsEvents(): OsReleaseEvent[] {
  if (!_bluefinOsEvents) {
    _bluefinOsEvents = enrichFromSbom(loadOsEvents(getBluefinReleasesData()));
  }
  return _bluefinOsEvents;
}

let _stableDailyOsEvents: OsReleaseEvent[] | null = null;
function getStableDailyOsEvents(): OsReleaseEvent[] {
  if (!_stableDailyOsEvents) {
    _stableDailyOsEvents = sbomStreamToEvents(
      getSbomCache(),
      "bluefin-stable-daily",
      "stable-daily",
      "https://github.com/orgs/ublue-os/packages/container/package/bluefin",
    );
  }
  return _stableDailyOsEvents;
}

let _ltsOsEvents: OsReleaseEvent[] | null = null;
function getLtsOsEvents(): OsReleaseEvent[] {
  if (!_ltsOsEvents) {
    _ltsOsEvents = enrichLtsHweKernelFromSbom(
      enrichLtsDxGdxFromSbom(
        enrichLtsFromHistory(enrichFromSbom(loadOsEvents(getBluefinLtsReleasesData(), "lts"))),
      ),
    );
  }
  return _ltsOsEvents;
}

// Rolling 12-month window for the stream — pinned cards (PINNED_OS_EVENTS) are unaffected.
let _allOsStreamEvents: OsReleaseEvent[] | null = null;
function getAllOsStreamEvents(): OsReleaseEvent[] {
  if (!_allOsStreamEvents) {
    const cutoff = Date.now() - ROLLING_WINDOW_MS;
    _allOsStreamEvents = [
      ...getBluefinOsEvents(),
      ...getStableDailyOsEvents(),
      ...getLtsOsEvents(),
    ]
      .filter((e) => e.dateMs > cutoff)
      .sort((a, b) => b.dateMs - a.dateMs);
  }
  return _allOsStreamEvents;
}

// Dakota placeholder — versions sourced from SBOM attestation on dakota-latest stream
// and BST element pins. Update when junction refs change.
// Last updated: freedesktop-sdk-25.08.10 + gnome-build-meta 50.1
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
      { name: "Kernel", version: "6.19.11", prevVersion: null },
      { name: "Gnome", version: "50.0", prevVersion: null },
      { name: "Mesa", version: "26.0.5", prevVersion: null },
      { name: "Podman", version: "5.8.2", prevVersion: null },
      { name: "bootc", version: "1.15.2", prevVersion: null },
      { name: "systemd", version: "260.1", prevVersion: null },
      { name: "pipewire", version: "1.6.1", prevVersion: null },
      { name: "sudo-rs", version: "0.2.13", prevVersion: null },
      { name: "uutils-coreutils", version: "0.8.0", prevVersion: null },
    ],
    dxPackages: [],
    gdxPackages: [
      { name: "Nvidia", version: "595.71.05", prevVersion: null },
    ],
    commits: [],
    fullDiff: [],
  },
};

// Pinned "Current Versions" cards: latest stable + latest LTS + Dakota placeholder.
// All bluefin releases are stable-daily; synthesise a "stable"-streamed clone for
// the pinned card so it shows the "Stable" badge while the stream shows "Daily".
let _pinnedOsEvents: OsReleaseEvent[] | null = null;
function computePinnedOsEvents(): OsReleaseEvent[] {
  if (!_pinnedOsEvents) {
    const bluefin = getBluefinOsEvents();
    const lts = getLtsOsEvents();
    // Pinned Bluefin card: most recent weekly stable release (stream === "stable").
    // stable-daily builds (latest-YYYYMMDD, if published) appear in the timeline only.
    const pinnedStable: OsReleaseEvent | undefined =
      bluefin.find((e) => e.stream === "stable") ?? bluefin[0];
    // Pinned LTS card: latest from LTS feed
    const pinnedLts: OsReleaseEvent | undefined = lts.length > 0 ? lts[0] : undefined;
    _pinnedOsEvents = [pinnedStable, pinnedLts, DAKOTA_PLACEHOLDER_EVENT]
      .filter((e): e is OsReleaseEvent => e !== undefined);
  }
  return _pinnedOsEvents;
}

// Exported as a Proxy so consumers can import PINNED_OS_EVENTS as a plain array
// while the actual computation is deferred until first property access (render time).
export const PINNED_OS_EVENTS: OsReleaseEvent[] = new Proxy([] as OsReleaseEvent[], {
  get(_, prop, receiver) {
    const target = computePinnedOsEvents();
    const value = Reflect.get(target, prop, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
  has(_, prop) {
    return prop in computePinnedOsEvents();
  },
  ownKeys() {
    return Reflect.ownKeys(computePinnedOsEvents());
  },
  getOwnPropertyDescriptor(_, prop) {
    return Object.getOwnPropertyDescriptor(computePinnedOsEvents(), prop);
  },
});

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

  const allEvents: FlatRelease[] = useMemo(() => {
    const cutoff = Date.now() - ROLLING_WINDOW_MS;
    return flattenReleases(firehoseData.apps ?? []).filter((e) => e.dateMs > cutoff);
  }, []);

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
    if (filters.updatedWithin === "all") return getAllOsStreamEvents();
    const maxAge = DAYS_MS[filters.updatedWithin];
    const now = Date.now();
    return getAllOsStreamEvents().filter((e) => e.dateMs > 0 && now - e.dateMs <= maxAge);
  }, [filters.packageType, filters.updatedWithin]);

  // How many stream OS events are hidden by the date filter
  const hiddenOsCount = useMemo(
    () =>
      filters.updatedWithin !== "all" &&
      filters.packageType !== "flatpak" &&
      filters.packageType !== "homebrew"
        ? getAllOsStreamEvents().filter((e) => e.dateMs > 0).length - filteredOsStreamEvents.length
        : 0,
    [filteredOsStreamEvents, filters.packageType, filters.updatedWithin],
  );

  // ── Unified "Updates Stream" ───────────────────────────────────────────────
  //
  // OS releases and app entries (flatpak/homebrew) are always shown together.

  const appSection = useMemo(
    () =>
      filteredUniqueApps
        .map(({ app, latestMs }): AppTimelineEvent => ({ kind: "app", app, dateMs: latestMs }))
        .sort((a, b) => b.dateMs - a.dateMs),
    [filteredUniqueApps],
  );

  const unifiedStream = useMemo((): FlatTimelineEvent[] => {
    const items: FlatTimelineEvent[] = [...appSection, ...filteredOsStreamEvents];
    items.sort((a, b) => b.dateMs - a.dateMs);
    return items;
  }, [filteredOsStreamEvents, appSection]);

  const isEmpty = allEvents.length === 0 && getAllOsStreamEvents().length === 0;
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
          <Statistics uniqueApps={uniqueApps} osEventCount={getAllOsStreamEvents().length} />
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
                    OS releases, Flatpak &amp; Homebrew packages included in Bluefin
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
