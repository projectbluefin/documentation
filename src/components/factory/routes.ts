/**
 * The single source of truth for /factory navigation.
 *
 * Authorized by adr/0003-factory-two-level-navigation.md.
 *
 * Both the nav component and each page import from here, so a route cannot
 * exist in one and not the other. `datasets` declares what a route needs; the
 * data provider loads exactly that set and nothing else, which is what keeps
 * eight routes from each paying for all of the data.
 */

export type FactoryPrimary = "live" | "factory";

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
  primary: FactoryPrimary;
  /** Stable id used for element ids. */
  id: string;
  label: string;
  /** Tooltip and the accessible description of what the tab contains. */
  hint: string;
  /** Build-time datasets this route needs. Loaded lazily by the provider. */
  datasets: DatasetKey[];
}

export const PRIMARIES: Array<{
  id: FactoryPrimary;
  label: string;
  hint: string;
}> = [
  {
    id: "live",
    label: "Live",
    hint: "Hive orchestration and the people around it",
  },
  {
    id: "factory",
    label: "Factory",
    hint: "What the factory builds, tests, ships and measures",
  },
];

export const FACTORY_ROUTES: FactoryRoute[] = [
  {
    path: "/factory",
    primary: "live",
    id: "overview",
    label: "Overview",
    hint: "Agents, governor, queue, advisories and what just shipped",
    datasets: ["registry", "hiveLive"],
  },
  {
    path: "/factory/community",
    primary: "live",
    id: "community",
    label: "Community",
    hint: "Contributors, leaderboards, discussions and merged work",
    datasets: ["hiveHistory", "registry", "hiveLive"],
  },
  {
    path: "/factory/images",
    primary: "factory",
    id: "images",
    label: "Images",
    hint: "Published image lanes, freshness and provenance",
    datasets: ["ghcrPackages", "images", "factoryStats"],
  },
  {
    path: "/factory/builds",
    primary: "factory",
    id: "builds",
    label: "Builds",
    hint: "Build health, durations and daily outcomes",
    datasets: ["factoryStats"],
  },
  {
    path: "/factory/tests",
    primary: "factory",
    id: "tests",
    label: "Tests",
    hint: "Test workflow outcomes, trends and triage",
    datasets: ["testRuns"],
  },
  {
    path: "/factory/applications",
    primary: "factory",
    id: "applications",
    label: "Applications",
    hint: "The applications Bluefin ships and how they move",
    datasets: ["firehoseApps", "flathub", "gnomeExtensions"],
  },
  {
    path: "/factory/metrics",
    primary: "factory",
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
    primary: "factory",
    id: "userspace",
    label: "Userspace",
    hint: "The userspace stack: base images, runtimes and toolboxes",
    datasets: ["ghcrPackages", "flathub"],
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

/** Unknown paths resolve to "live" so the nav always renders something sane. */
export function primaryOf(pathname: string): FactoryPrimary {
  return routeFor(pathname)?.primary ?? "live";
}

export function secondaryFor(primary: FactoryPrimary): FactoryRoute[] {
  return FACTORY_ROUTES.filter((r) => r.primary === primary);
}

/** Clicking a primary goes to its first secondary. */
export function landingFor(primary: FactoryPrimary): string {
  return secondaryFor(primary)[0].path;
}
