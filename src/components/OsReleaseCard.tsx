import React, { useState, useCallback } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Heading from "@theme/Heading";
import type {
  OsReleaseEvent,
  ParsedMajorPackage,
  ParsedCommit,
  ParsedDiffEntry,
} from "../types/os-feed";
import streamPinsData from "@site/static/data/stream-pins.json";
import styles from "./OsReleaseCard.module.css";

interface StreamPins {
  hweKernel?: string | null;
  kernel?: string | null;
  mesa?: string | null;
  nvidia?: string | null;
  gnome?: string | null;
}

interface PinsData {
  streams?: Record<string, StreamPins>;
}

/** Map OsReleaseEvent stream IDs to stream-pins.json stream keys. */
const STREAM_TO_PIN_KEY: Record<string, string> = {
  lts: "bluefin-lts",
  stable: "bluefin-stable",
  "stable-daily": "bluefin-stable",
};

/** Map chip display name (lowercase) to StreamPins field. */
const CHIP_NAME_TO_PIN_KEY: Record<string, keyof StreamPins> = {
  "hwe kernel": "hweKernel",
  kernel: "kernel",
  mesa: "mesa",
  nvidia: "nvidia",
  gnome: "gnome",
};

const pinsCatalog = streamPinsData as unknown as PinsData;

// ── Date formatting ───────────────────────────────────────────────────────────

function formatDate(dateMs: number): string {
  const d = new Date(dateMs);
  if (isNaN(d.getTime())) return "";
  // UTC to avoid SSR/hydration mismatch from local timezone offsets
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ── Collapsible ───────────────────────────────────────────────────────────────

interface CollapsibleProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

function Collapsible({ id, label, children }: CollapsibleProps) {
  const [open, setOpen] = useState(false);
  const panelId = `${id}-panel`;
  return (
    <div className={styles.collapsible}>
      <button
        type="button"
        className={styles.collapsibleToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className={styles.chevron} aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
        {label}
      </button>
      {open && (
        <div id={panelId} className={styles.collapsiblePanel}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Package diff section ──────────────────────────────────────────────────────

function PackageDiffSection({ fullDiff }: { fullDiff: ParsedDiffEntry[] }) {
  if (fullDiff.length === 0) {
    return <p className={styles.emptyNote}>No package diff available.</p>;
  }

  const added = fullDiff.filter((e) => e.indicator === "added");
  const changed = fullDiff.filter((e) => e.indicator === "changed");
  const removed = fullDiff.filter((e) => e.indicator === "removed");

  return (
    <div className={styles.diffSection}>
      {added.length > 0 && (
        <>
          <div className={styles.diffGroupHeader}>
            <span aria-hidden="true">✨</span> Added ({added.length})
          </div>
          {added.map((e) => (
            <div key={e.name} className={`${styles.diffRow} ${styles.diffAdded}`}>
              <span className={styles.diffName}>{e.name}</span>
              <span className={styles.diffVersion}>{e.newVersion}</span>
            </div>
          ))}
        </>
      )}
      {changed.length > 0 && (
        <>
          <div className={styles.diffGroupHeader}>
            <span aria-hidden="true">🔄</span> Updated ({changed.length})
          </div>
          {changed.map((e) => (
            <div key={e.name} className={`${styles.diffRow} ${styles.diffChanged}`}>
              <span className={styles.diffName}>{e.name}</span>
              <span className={styles.diffVersionChange}>
                <span className={styles.prevVersion}>{e.prevVersion}</span>
                <span className={styles.versionArrow} aria-hidden="true">→</span>
                <span className={styles.newVersion}>{e.newVersion}</span>
              </span>
            </div>
          ))}
        </>
      )}
      {removed.length > 0 && (
        <>
          <div className={styles.diffGroupHeader}>
            <span aria-hidden="true">❌</span> Removed ({removed.length})
          </div>
          {removed.map((e) => (
            <div key={e.name} className={`${styles.diffRow} ${styles.diffRemoved}`}>
              <span className={styles.diffName}>{e.name}</span>
              <span className={styles.diffVersion}>{e.prevVersion}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Commits section ───────────────────────────────────────────────────────────

function CommitsSection({ commits }: { commits: ParsedCommit[] }) {
  if (commits.length === 0) {
    return <p className={styles.emptyNote}>No commits listed.</p>;
  }
  return (
    <div className={styles.commitsSection}>
      {commits.map((c) => (
        <div key={`${c.hash}-${c.subject.slice(0, 20)}`} className={styles.commitRow}>
          <span className={styles.commitHash}>
            {c.url ? (
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                {c.hash}
              </a>
            ) : (
              c.hash
            )}
          </span>
          <span className={styles.commitSubject}>{c.subject}</span>
          {c.author && <span className={styles.commitAuthor}>{c.author}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Version chip ──────────────────────────────────────────────────────────────

function VersionChip({ pkg, pinnedVersion }: { pkg: ParsedMajorPackage; pinnedVersion?: string | null }) {
  const changed = Boolean(pkg.prevVersion);
  const isPinned = pinnedVersion != null && pkg.version === pinnedVersion;
  return (
    <span
      className={`${styles.versionChip} ${changed ? styles.chipChanged : ""} ${isPinned ? styles.chipPinned : ""}`}
      title={
        isPinned
          ? `Pinned to ${pinnedVersion} by maintainer — not following upstream`
          : changed
            ? `Previously: ${pkg.prevVersion}`
            : undefined
      }
    >
      <span className={styles.chipLabel}>{pkg.name}</span>
      <span className={styles.chipValue}>{pkg.version}</span>
      {isPinned && (
        <span className={styles.chipPinnedIcon} aria-label="pinned">📌</span>
      )}
      {!isPinned && changed && (
        <span className={styles.chipUpdated} aria-label="updated">
          ↑
        </span>
      )}
    </span>
  );
}

// ── Chip labels we surface in the header chips row ────────────────────────────

const HEADER_CHIP_NAMES = ["Kernel", "HWE Kernel", "Gnome", "Mesa", "Podman", "Nvidia", "bootc", "systemd", "pipewire", "flatpak", "sudo-rs", "uutils-coreutils"];

// ── Embed button ──────────────────────────────────────────────────────────────

function EmbedButton({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => console.error("Failed to copy snippet:", err));
  }, [snippet]);
  return (
    <button
      type="button"
      className={styles.embedButton}
      onClick={handleCopy}
      title="Copy embed snippet"
    >
      {copied ? "Copied!" : "Embed ↗"}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface OsReleaseCardProps {
  event: OsReleaseEvent;
}

const OsReleaseCard: React.FC<OsReleaseCardProps> = ({ event }) => {
  const { release, dateMs, stream } = event;
  const isLts = stream === "lts";
  const isDaily = stream === "stable-daily";
  const isDakota = stream === "dakota";

  const streamLabel = isLts ? "LTS" : isDaily ? "Daily" : isDakota ? "Dakota" : "Stable";
  const cardVariantClass = isLts ? styles.cardLts : isDakota ? styles.cardDakota : styles.cardStable;
  const cardClass = `${styles.card} ${cardVariantClass}`;

  // Pin lookup for this stream
  const pinKey = STREAM_TO_PIN_KEY[stream] ?? null;
  const streamPins: StreamPins | null = pinKey ? ((pinsCatalog.streams?.[pinKey] ?? null) as StreamPins | null) : null;

  // Key package chips (header row): subset of well-known packages.
  // Falls back to fullDiff when a name isn't in the curated majorPackages table.
  const headerChips = HEADER_CHIP_NAMES.flatMap((name) => {
    const major = release.majorPackages.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (major) return [major];
    const diff = release.fullDiff.find(
      (d) => d.name.toLowerCase() === name.toLowerCase(),
    );
    if (diff && diff.newVersion) {
      return [{ name: diff.name, version: diff.newVersion, prevVersion: diff.prevVersion }];
    }
    return [];
  });

  // Diff summary for collapsible label
  const addedCount = release.fullDiff.filter((e) => e.indicator === "added").length;
  const changedCount = release.fullDiff.filter((e) => e.indicator === "changed").length;
  const removedCount = release.fullDiff.filter((e) => e.indicator === "removed").length;
  const diffParts: string[] = [];
  if (changedCount > 0) diffParts.push(`${changedCount} updated`);
  if (addedCount > 0) diffParts.push(`${addedCount} added`);
  if (removedCount > 0) diffParts.push(`${removedCount} removed`);
  const diffSummary = diffParts.join(" · ");

  const cardId = `os-release-${release.tag}`;

  const cardTitle = isLts ? "Bluefin LTS" : isDakota ? "Bluefin Dakota" : "Bluefin";
  const imagesAnchor = isLts ? "bluefin-lts" : isDakota ? "bluefin-dakota" : "bluefin-stable";
  const cardSlug = isLts ? "bluefin-lts" : isDakota ? "dakota" : "bluefin";
  const cardAlt = cardTitle;
  const { siteConfig } = useDocusaurusContext();
  const BASE_URL = siteConfig.url;
  const embedSnippet = [
    `<a href="${BASE_URL}/changelogs">`,
    `  <picture>`,
    `    <source media="(prefers-color-scheme: dark)" srcset="${BASE_URL}/img/cards/${cardSlug}-dark.png">`,
    `    <img src="${BASE_URL}/img/cards/${cardSlug}-light.png" alt="${cardAlt}" width="800">`,
    `  </picture>`,
    `</a>`,
  ].join("\n");

  return (
    <article
      className={cardClass}
      aria-label={`${streamLabel} OS release ${release.tag}`}
    >
      {/* ── Header ── */}
      <div className={styles.cardHeader}>
        <div className={styles.titleRow}>
          <Heading as="h2" className={styles.cardTitle}>{cardTitle}</Heading>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.releaseTag}>{release.tag}</span>
          {dateMs > 0 && <span className={styles.releaseDate}>{formatDate(dateMs)}</span>}
          {release.fedoraVersion && (
            <span className={styles.baseChip}>Fedora {release.fedoraVersion}</span>
          )}
          {release.centosVersion && (
            <span className={styles.baseChip}>CentOS {release.centosVersion}</span>
          )}
        </div>
      </div>

      {/* ── Key package version chips ── */}
      {headerChips.length > 0 && (
        <div className={styles.chipsRow}>
          {headerChips.map((pkg) => {
            const pinField = CHIP_NAME_TO_PIN_KEY[pkg.name.toLowerCase()];
            const pinnedVersion = pinField ? streamPins?.[pinField] : null;
            return <VersionChip key={pkg.name} pkg={pkg} pinnedVersion={pinnedVersion} />;
          })}
        </div>
      )}

      {/* ── DX packages ── */}
      {release.dxPackages.length > 0 && (
        <div className={styles.dxRow}>
          <span className={styles.dxLabel}>DX</span>
          {release.dxPackages.map((pkg) => (
            <VersionChip key={pkg.name} pkg={pkg} />
          ))}
        </div>
      )}

      {/* ── GDX packages (LTS only — Nvidia, CUDA) ── */}
      {release.gdxPackages.length > 0 && (
        <div className={styles.dxRow}>
          <span className={styles.dxLabel}>GDX</span>
          {release.gdxPackages.map((pkg) => (
            <VersionChip key={pkg.name} pkg={pkg} />
          ))}
        </div>
      )}

      {/* ── Collapsible: package diff ── */}
      {release.fullDiff.length > 0 && (
        <Collapsible
          id={`${cardId}-diff`}
          label={`Package changes${diffSummary ? ` — ${diffSummary}` : ""}`}
        >
          <PackageDiffSection fullDiff={release.fullDiff} />
        </Collapsible>
      )}

      {/* ── Collapsible: commits ── */}
      <Collapsible
        id={`${cardId}-commits`}
        label={`Commits${release.commits.length > 0 ? ` (${release.commits.length})` : ""}`}
      >
        <CommitsSection commits={release.commits} />
      </Collapsible>

      {/* ── Footer ── */}
      <div className={styles.cardFooter}>
        <a
          href={release.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.viewLink}
        >
          View on GitHub →
        </a>
        <a
          href={`/images#${imagesAnchor}`}
          className={styles.viewLink}
        >
          Image details →
        </a>
        <EmbedButton snippet={embedSnippet} />
      </div>
    </article>
  );
};

export default OsReleaseCard;
