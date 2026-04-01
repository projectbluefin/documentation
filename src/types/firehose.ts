// Types derived from castrojo/bluefin-releases internal/models/models.go

export interface FirehoseSourceRepo {
  type: "github" | "gitlab" | string;
  url: string;
  owner: string;
  repo: string;
}

export interface FirehoseRelease {
  version: string;
  date: string; // ISO 8601
  title: string;
  description: string; // HTML
  type: "appstream" | "github" | string;
}

export type FirehosePackageType = "flatpak" | "homebrew" | "os-release";
export type FirehoseAppSet = "core" | "dx" | string;

export interface FirehoseApp {
  id: string;
  name: string;
  summary: string;
  description: string; // HTML
  icon: string; // URL
  updatedAt: string; // ISO 8601
  currentReleaseVersion: string;
  currentReleaseDate: string; // ISO 8601
  flathubUrl?: string;
  formula?: string; // homebrew formula name
  sourceRepo?: FirehoseSourceRepo;
  releases: FirehoseRelease[];
  fetchedAt: string; // ISO 8601
  isVerified: boolean;
  appSet: FirehoseAppSet;
  packageType: FirehosePackageType;
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
}
