/**
 * The single source of truth for /factory navigation.
 *
 * One unified factory, one row of tabs. The hive is not separated from the
 * rest: agent orchestration, builds, tests and adoption are all views of the
 * same factory, so they sit as peers rather than behind a Live/Factory split.
 *
 * Both the nav component and each page import from here, so a route cannot
 * exist in one and not the other. `datasets` declares what a route needs; the
 * data provider loads exactly that set and nothing else, which keeps eight
 * routes from each paying for all of the data.
 */

export const DATASET_KEYS = [
  "hiveHistory",
  "registry",
  "factoryStats",
  "hiveLive",
  "countme",
  "brew",
  "flathub",
  "scorecard",
  "dora",
  "testRuns",
  "ghcrPackages",
  "firehoseApps",
  "gnomeExtensions",
  "images",
] as const;

export type DatasetKey = (typeof DATASET_KEYS)[number];

export interface FactoryRoute {
  /** Route path, no trailing slash, no baseUrl. */
  path: string;
  /** Stable id used for element ids. */
  id: string;
  label: string;
  /** Tooltip and the accessible description of what the tab contains. */
  hint: string;
  /** Build-time datasets this route needs. Loaded lazily by the provider. */
  datasets: DatasetKey[];
}

export const FACTORY_ROUTES: FactoryRoute[] = [
  {
    path: "/factory",
    id: "overview",
    label: "Overview",
    hint: "Agents, governor, queue, advisories and what just shipped",
    datasets: ["registry", "hiveLive"],
  },
  {
    path: "/factory/images",
    id: "images",
    label: "Images",
    hint: "Published image lanes, freshness and provenance",
    datasets: ["ghcrPackages", "images", "factoryStats"],
  },
  {
    path: "/factory/builds",
    id: "builds",
    label: "Builds",
    hint: "Build health, durations and daily outcomes",
    datasets: ["factoryStats"],
  },
  {
    path: "/factory/tests",
    id: "tests",
    label: "Tests",
    hint: "Test workflow outcomes, trends and triage",
    datasets: ["testRuns"],
  },
  {
    path: "/factory/applications",
    id: "applications",
    label: "Applications",
    hint: "The applications Bluefin ships and how they move",
    datasets: ["firehoseApps", "flathub", "gnomeExtensions"],
  },
  {
    path: "/factory/metrics",
    id: "metrics",
    label: "Metrics",
    hint: "Adoption, ecosystem share, delivery and security posture",
    datasets: [
      "countme",
      "brew",
      "scorecard",
      "dora",
      "registry",
      "hiveHistory",
    ],
  },
  {
    path: "/factory/userspace",
    id: "userspace",
    label: "Userspace",
    hint: "The userspace stack: base images and runtimes",
    datasets: ["ghcrPackages", "flathub"],
  },
  {
    path: "/factory/community",
    id: "community",
    label: "Community",
    hint: "Contributors, leaderboards, discussions and merged work",
    datasets: ["hiveHistory", "registry", "hiveLive"],
  },
];

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function routeFor(pathname: string): FactoryRoute | undefined {
  const p = normalize(pathname);
  return FACTORY_ROUTES.find((r) => r.path === p);
}

/** Clicking the brand or an unknown path lands on the first tab. */
export function landingPath(): string {
  return FACTORY_ROUTES[0].path;
}
