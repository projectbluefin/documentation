/**
 * Types for OS release feed data.
 *
 * Raw feed data lives in:
 *   static/feeds/bluefin-releases.json     (stable stream)
 *   static/feeds/bluefin-lts-releases.json (lts stream)
 *
 * GTS (Good Till September) was a retired stream. gts-prefixed entries may
 * appear in the stable feed as historical records — they are skipped by the
 * parser. Tracked for cleanup in castrojo/documentation issue 68.
 */

import type { FirehoseApp } from "./firehose";

// ── Raw feed shape ────────────────────────────────────────────────────────────

/** One item from the GitHub Releases RSS-to-JSON feed. */
export interface OsFeedItem {
  title: string;
  link: string;
  pubDate: string; // ISO 8601
  contentSnippet: string;
  content: string; // HTML — contains structured tables for packages and commits
}

export interface OsFeedData {
  title: string;
  items: OsFeedItem[];
}

// ── Parsed structures ─────────────────────────────────────────────────────────

/** The active Bluefin release streams. GTS is retired — skipped in parser. */
export type OsStream = "stable" | "stable-daily" | "lts" | "dakota";

/**
 * A package entry from the "Major packages" or "Major DX packages" section.
 * prevVersion is set when the version cell contains "old ➡️ new" (a changed package).
 * prevVersion is null when the package version is listed without an arrow (unchanged or new).
 */
export interface ParsedMajorPackage {
  name: string;
  /** Current version. */
  version: string;
  /** Previous version, present only when the cell shows "prev ➡️ current". */
  prevVersion: string | null;
}

/** A commit entry from the "Commits" table. Author is absent in LTS 2-column tables. */
export interface ParsedCommit {
  hash: string;
  /** Full GitHub commit URL (https://github.com/... only). Null if not found. */
  url: string | null;
  /** Plain-text commit subject (HTML stripped). */
  subject: string;
  /** Commit author name. Null in LTS feed (2-column table format). */
  author: string | null;
}

/**
 * One entry from the full package diff tables ("All Images", "Base Images",
 * "Dev Experience Images"). These use emoji indicators in the first column.
 */
export interface ParsedDiffEntry {
  indicator: "added" | "changed" | "removed";
  name: string;
  prevVersion: string | null;
  newVersion: string | null;
}

/** All structured data parsed from a single OsFeedItem. */
export interface ParsedOsRelease {
  stream: OsStream;
  /** Release tag, e.g. "stable-20260331" or "lts-20251223". */
  tag: string;
  /** URL to the GitHub release page. */
  githubUrl: string;
  /** Fedora base version, e.g. "43". Null for LTS (CentOS base). */
  fedoraVersion: string | null;
  /** CentOS base version, e.g. "c10s". Null for stable (Fedora base). */
  centosVersion: string | null;
  /** Entries from the "Major packages" table. */
  majorPackages: ParsedMajorPackage[];
  /** Entries from the "Major DX packages" table (dev tools: Docker, VSCode, etc.). */
  dxPackages: ParsedMajorPackage[];
  /** Entries from the "Major GDX packages" table (GPU extras: Nvidia, CUDA). Present on LTS only. */
  gdxPackages: ParsedMajorPackage[];
  /** Commit list. Empty array if no commits section is present. */
  commits: ParsedCommit[];
  /**
   * Merged full package diff from all 4-column diff tables
   * ("All Images", "Base Images", "Dev Experience Images").
   */
  fullDiff: ParsedDiffEntry[];
}

// ── Timeline event types ──────────────────────────────────────────────────────

/**
 * A timeline event representing one OS release.
 * kind: "os" discriminant enables exhaustive narrowing with AppTimelineEvent.
 */
export interface OsReleaseEvent {
  kind: "os";
  stream: OsStream;
  dateMs: number;
  release: ParsedOsRelease;
}

/**
 * A timeline event wrapping a Firehose app (one card per app, most recent release).
 * kind: "app" discriminant enables exhaustive narrowing with OsReleaseEvent.
 */
export interface AppTimelineEvent {
  kind: "app";
  dateMs: number;
  app: FirehoseApp;
}

/** Discriminated union for the unified Firehose + OS release timeline. */
export type FlatTimelineEvent = AppTimelineEvent | OsReleaseEvent;
