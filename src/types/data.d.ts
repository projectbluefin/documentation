/**
 * Type definitions for auto-generated JSON data files.
 * These files are generated at build time by scripts in scripts/ directory.
 * DO NOT manually edit the JSON files - they are regenerated on every build.
 */

/**
 * YouTube playlist metadata from scripts/fetch-playlists.js
 * Used by: src/components/MusicPlaylist.tsx
 */
export interface PlaylistMetadata {
  id: string;
  title: string;
  thumbnailUrl: string;
  description: string;
  playlistUrl: string;
}

/**
 * GitHub user profile data from scripts/fetch-github-profiles.js
 * Used by: src/components/GitHubProfileCard.tsx, docs/donations/contributors.mdx
 */
export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
}

/**
 * GitHub repository stats from scripts/fetch-github-repos.js
 * Used by: src/components/ProjectCard.tsx, docs/donations/projects.mdx
 */
export interface GitHubRepoStats {
  repo: string; // Format: "owner/repo"
  stars: number;
  forks: number;
  description: string | null;
  homepage: string | null;
  language: string | null;
}

/**
 * GNOME extension metadata from scripts/fetch-gnome-extensions.js
 * Used by: src/components/GnomeExtensions.tsx
 */
export interface GnomeExtension {
  id: number;
  uuid: string;
  name: string;
  description: string;
  creator: string;
  creatorUrl: string;
  url: string;
  screenshot: string;
  remoteScreenshot: string;
  icon: string;
  donateUrl: string | null;
}

/**
 * Project board data from scripts/fetch-board-data.js
 * Used by: src/components/BoardChangelog.tsx
 */
export interface BoardItem {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  state: string;
  labels: string[];
}

/**
 * File contributors from scripts/fetch-contributors.js
 * Used by: src/components/PageContributors.tsx
 * Structure: Record of file paths to contributor arrays
 */
export interface FileContributor {
  login: string;
  html_url: string;
  avatar_url: string;
}

export type FileContributorsData = Record<string, FileContributor[]>;

/**
 * Board changelog items from scripts/fetch-board-data.js
 * Used by: src/components/BoardChangelog.tsx
 */
export interface BoardChangelogItem {
  date: string;
  title: string;
  url: string;
  type: "issue" | "pr";
  state: "open" | "closed" | "merged";
}
