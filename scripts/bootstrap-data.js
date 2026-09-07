#!/usr/bin/env node

/**
 * Create deterministic, network-free data seeds for a fresh checkout.
 *
 * This is intentionally separate from the fetch pipeline. It never contacts
 * GitHub or another remote service, and it never overwrites an existing
 * generated file. Run it once after npm install:
 *
 *   npm run bootstrap
 *
 * A later fetch-data run can replace each seed with live data.
 */

const fs = require("node:fs");
const path = require("node:path");
const { PLAYLISTS } = require("./fetch-playlist-metadata.js");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "static", "data");
const FEEDS_DIR = path.join(ROOT, "static", "feeds");
const GENERATED_AT = "1970-01-01T00:00:00.000Z";
const BOOTSTRAP_REASON =
  "Bootstrap data only; run the network fetch pipeline to populate live data.";

const EMPTY_STATS = {
  appsTotal: 0,
  appsWithGitHubRepo: 0,
  appsWithGitLabRepo: 0,
  appsWithChangelogs: 0,
  totalReleases: 0,
};

function unavailable(shape = {}) {
  return {
    generatedAt: GENERATED_AT,
    ...shape,
    unavailable: true,
    stateReason: BOOTSTRAP_REASON,
  };
}

function playlistSeed() {
  return PLAYLISTS.map(({ id, title }) => ({
    id,
    title,
    thumbnailUrl: null,
    description: "",
    playlistUrl: `https://www.youtube.com/playlist?list=${id}`,
  }));
}

/**
 * Return every generated input needed by the source components and factory
 * data loader. The object is pure and deterministic so it can be tested
 * without touching the checkout.
 */
function buildSeeds() {
  const data = {
    "playlist-metadata.json": playlistSeed(),
    "file-contributors.json": unavailable(),
    "github-repos.json": unavailable(),
    "github-profiles.json": unavailable(),
    "driver-versions.json": unavailable({
      cacheHours: 0,
      historyDays: 0,
      streams: [],
    }),
    "stream-pins.json": unavailable({
      streams: {},
    }),
    "images.json": unavailable({
      cacheHours: 0,
      refreshHours: 0,
      staleDays: 0,
      products: [],
    }),
    "firehose-apps.json": unavailable({
      schemaVersion: "1.0.0",
      stats: { ...EMPTY_STATS },
      apps: [],
    }),
    "sbom-attestations.json": unavailable({
      lookbackDays: 0,
      maxReleasesPerStream: 0,
      streams: {},
    }),
    "sbom-attestations-frontend.json": unavailable({
      lookbackDays: 0,
      maxReleasesPerStream: 0,
      streams: {},
    }),
    "gnome-extensions.json": unavailable({
      extensions: [],
    }),
    "hive-history.json": unavailable({
      entries: [],
      contributors: {},
      contributorsByRepo: {},
      contributorStats: {},
      contributorWeekStarts: [],
      lastContributorFetch: null,
      lastWeeklyStatsFetch: null,
    }),
    "registry-data.json": unavailable(),
    "factory-stats.json": unavailable({
      window: { days: 7, from: null, to: null },
      lanes: [],
      totals: {
        total: 0,
        passed: 0,
        failed: 0,
        running: 0,
        successRate: null,
        medianDurationMin: null,
        averageDurationMin: null,
      },
      daily: [],
    }),
    "hive-live-data.json": unavailable({
      mergedPRs: [],
      discussions: [],
      hivePRs: [],
      copilotPRs: [],
      velocity: { opened: 0, closed: 0 },
      testBuilds: 0,
      tapPromotions: 0,
      agentMergedCount: 0,
      orgStats: {
        totalRepos: 0,
        openIssues: 0,
        openPRs: 0,
        mergedThisWeek: 0,
        agentReadyIssues: 0,
        agentOpenPRs: 0,
        sourceAgentOpen: 0,
      },
    }),
    "countme-history.json": unavailable({
      source:
        "https://data-analysis.fedoraproject.org/csv-reports/countme/totals.csv",
      method: "ublue-countme-v1",
      unit: "estimated weekly active systems",
      variants: ["bluefin", "bluefin-lts", "aurora", "bazzite", "fedora"],
      weeks: [],
    }),
    "brew-analytics.json": unavailable({
      source: "https://formulae.brew.sh/api/analytics/os-version/{window}.json",
      windows: {
        "30d": {
          startDate: null,
          endDate: null,
          totalCount: null,
          trackedItems: null,
          rows: [],
          peers: [],
          unavailable: true,
          stateReason: BOOTSTRAP_REASON,
        },
        "90d": {
          startDate: null,
          endDate: null,
          totalCount: null,
          trackedItems: null,
          rows: [],
          peers: [],
          unavailable: true,
          stateReason: BOOTSTRAP_REASON,
        },
        "365d": {
          startDate: null,
          endDate: null,
          totalCount: null,
          trackedItems: null,
          peers: [],
          rows: [],
          unavailable: true,
          stateReason: BOOTSTRAP_REASON,
        },
      },
    }),
    "flathub-stats.json": unavailable({
      source: "https://flathub.org/api/v2/stats",
      platform: { downloads: null, apps: null, verifiedApps: null },
      downloadsPerDay: [],
      byOs: [],
      flatpakVersionsOnBluefin: [],
    }),
    "scorecard-history.json": unavailable({
      source: "https://api.securityscorecards.dev/projects/github.com/{repo}",
      repos: [],
    }),
    "dora.json": unavailable({
      windowDays: 365,
      repos: [
        "projectbluefin/bluefin",
        "projectbluefin/bluefin-lts",
        "projectbluefin/dakota",
      ],
      monthly: [],
      current: {
        deploymentsPerWeek: null,
        changeFailureRate: null,
        medianLeadTimeHours: null,
        leadTimeReason: BOOTSTRAP_REASON,
      },
    }),
    "test-runs.json": unavailable({
      windowDays: 30,
      suites: [],
    }),
    "ghcr-packages.json": unavailable({
      orgs: ["projectbluefin"],
      packages: [],
      familyCounts: {},
    }),
    "artwork.json": unavailable({
      projects: {},
    }),
    "artwork-versions.json": unavailable({
      versions: {},
      updatedAt: GENERATED_AT,
    }),
  };

  const feeds = {
    "bluefin-releases.json": unavailable({
      title: "projectbluefin/bluefin Releases",
      items: [],
    }),
    "bluefin-lts-releases.json": unavailable({
      title: "projectbluefin/bluefin-lts Releases",
      items: [],
    }),
  };

  return { data, feeds };
}

function writeIfMissing(filePath, payload) {
  if (fs.existsSync(filePath)) {
    console.log(`bootstrap-data: keeping ${filePath}`);
    return false;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`bootstrap-data: wrote ${filePath}`);
  return true;
}

function bootstrap({
  dataDir = DATA_DIR,
  feedsDir = FEEDS_DIR,
  seeds = buildSeeds(),
} = {}) {
  let created = 0;

  for (const [name, payload] of Object.entries(seeds.data)) {
    if (writeIfMissing(path.join(dataDir, name), payload)) created += 1;
  }
  for (const [name, payload] of Object.entries(seeds.feeds)) {
    if (writeIfMissing(path.join(feedsDir, name), payload)) created += 1;
  }

  return {
    created,
    total: Object.keys(seeds.data).length + Object.keys(seeds.feeds).length,
  };
}

if (require.main === module) {
  bootstrap();
}

module.exports = {
  BOOTSTRAP_REASON,
  GENERATED_AT,
  buildSeeds,
  bootstrap,
  playlistSeed,
  writeIfMissing,
};
