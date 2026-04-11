// Types derived from castrojo/bluefin-releases internal/models/models.go

export interface FirehoseSourceRepo {
  type: "github" | "gitlab" | string;
  url: string;
  owner: string;
  repo: string;
}

export interface FirehosePackageVersions {
  kernel?: string | null;
  gnome?: string | null;
  mesa?: string | null;
  podman?: string | null;
  systemd?: string | null;
  bootc?: string | null;
  fedora?: string | null;
  /** Full RPM name→version map — used for diff computation */
  allPackages?: Record<string, string> | null;
}

/** One package entry in a release diff */
export interface FirehosePackageDiffEntry {
  name: string;
  /** Version in this release (null for removed packages) */
  newVersion: string | null;
  /** Version in the previous release (null for added packages) */
  oldVersion: string | null;
}

/** Per-release diff: packages added, changed, or removed vs the previous release */
export interface FirehosePackageDiff {
  added: FirehosePackageDiffEntry[];
  changed: FirehosePackageDiffEntry[];
  removed: FirehosePackageDiffEntry[];
}

export interface FirehoseRelease {
  version: string;
  date: string; // ISO 8601
  title: string;
  description?: string | null; // HTML — may be null for OS SBOM entries
  type: "appstream" | "github" | "os-sbom" | string;
  url?: string | null; // link to the release page (e.g. GitHub/GitLab release URL)
  /** Package versions from SBOM — only present on os-sbom release entries */
  packageVersions?: FirehosePackageVersions | null;
  /** RPM diff vs previous release — only present on os-sbom entries when allPackages available */
  packageDiff?: FirehosePackageDiff | null;
}

export type FirehosePackageType = "flatpak" | "homebrew" | "os";
export type FirehoseAppSet = "core" | "dx" | string;

export interface FirehoseOsInfo {
  stream?: string;
  fedoraVersion?: string;
  centosVersion?: string;
  buildNumber?: string;
  commitHash?: string;
  imageName?: string;
  kernelVersion?: string;
  gnomeVersion?: string;
  mesaVersion?: string;
  /** Key: package name (e.g. "Docker", "Podman", "Nvidia", "Incus"), value: RPM version string */
  majorPackages?: Record<string, string>;
}

export interface FirehoseHomebrewInfo {
  formula?: string;
  fullName?: string;
  tap?: string;
  homepage?: string;
  versions?: string[];
}

export interface FirehoseApp {
  id: string;
  name: string;
  summary?: string;
  description?: string; // HTML
  icon?: string; // URL
  updatedAt?: string; // ISO 8601 — may be absent if no release history found
  currentReleaseVersion?: string;
  currentReleaseDate?: string; // ISO 8601
  flathubUrl?: string;
  formula?: string; // homebrew formula name (top-level, legacy)
  homebrewInfo?: FirehoseHomebrewInfo; // richer homebrew metadata
  osInfo?: FirehoseOsInfo; // OS-specific version metadata (SBOM-sourced)
  sourceRepo?: FirehoseSourceRepo;
  releases?: FirehoseRelease[]; // may be absent/empty if no tracked releases
  fetchedAt?: string; // ISO 8601
  isVerified?: boolean;
  appSet?: FirehoseAppSet;
  packageType: FirehosePackageType;
  experimental?: boolean;
  // Optional enrichment fields
  installsLastMonth?: number;
  categories?: string[];
}

export interface FirehoseStats {
  appsTotal: number;
  appsWithGitHubRepo?: number;
  appsWithGitLabRepo?: number;
  appsWithChangelogs?: number;
  totalReleases?: number;
}

export interface FirehoseMetadata {
  schemaVersion?: string;
  generatedAt?: string; // ISO 8601
  generatedBy?: string;
  buildDuration?: string;
  stats?: FirehoseStats;
}

export interface FirehoseData {
  apps: FirehoseApp[];
  metadata: FirehoseMetadata;
}

// Filter state used by FirehoseFilters / FirehoseFeed
export interface FirehoseFilterState {
  packageType: "all" | FirehosePackageType;
  category: string; // "all" or category name
  appSet: "all" | FirehoseAppSet;
  updatedWithin: "all" | "1d" | "7d" | "30d" | "90d";
  verifiedOnly: boolean;
  unverifiedOnly: boolean;
  /** When false (default), only OS releases are shown in the Updates Stream.
   *  When true, Flatpak and Homebrew app entries are also included. */
  showEverything: boolean;
}
