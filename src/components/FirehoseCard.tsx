import React, { useState, useCallback } from "react";
import { SiFlathub } from "react-icons/si";
import { FaGithub, FaGitlab, FaCopy, FaCheck } from "react-icons/fa";
import type {
  FirehoseApp,
  FirehosePackageVersions,
  FirehosePackageDiff,
} from "../types/firehose";
import styles from "./FirehoseCard.module.css";
import { sanitizeHtml } from "../utils/sanitizeHtml";

interface FirehoseCardProps {
  app: FirehoseApp;
  defaultCollapsed?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PackageBadge({ type }: { type: string }) {
  const label =
    type === "flatpak" ? "Flathub" : type === "homebrew" ? "Homebrew" : "Release";
  return (
    <span className={`${styles.packageTypeBadge} ${styles[`badge_${type}`]}`}>
      {label}
    </span>
  );
}

function CopyButton({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }, [command]);

  return (
    <button
      className={`${styles.copyButton} ${copied ? styles.copied : ""}`}
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy install command"}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
    </button>
  );
}

/** Labels and ordering for OS package version chips */
const OS_CHIP_DEFS: Array<{
  key: Exclude<keyof FirehosePackageVersions, "allPackages">;
  label: string;
}> = [
  { key: "fedora", label: "Fedora" },
  { key: "kernel", label: "Kernel" },
  { key: "gnome", label: "GNOME" },
  { key: "mesa", label: "Mesa" },
  { key: "podman", label: "Podman" },
  { key: "systemd", label: "systemd" },
  { key: "bootc", label: "bootc" },
];

function OsPackageChips({ versions }: { versions: FirehosePackageVersions }) {
  const chips = OS_CHIP_DEFS.filter(({ key }) => versions[key]);
  if (chips.length === 0) return null;
  return (
    <div className={styles.osChipGrid}>
      {chips.map(({ key, label }) => (
        <span key={key} className={styles.osChip}>
          <span className={styles.osChipLabel}>{label}</span>
          <span className={styles.osChipVersion}>{versions[key]}</span>
        </span>
      ))}
    </div>
  );
}

function OsPackageDiff({ diff }: { diff: FirehosePackageDiff }) {
  const [expanded, setExpanded] = useState(false);
  const total = diff.added.length + diff.changed.length + diff.removed.length;
  if (total === 0) return null;

  const summary = [
    diff.added.length > 0 && `+${diff.added.length} added`,
    diff.changed.length > 0 && `~${diff.changed.length} changed`,
    diff.removed.length > 0 && `-${diff.removed.length} removed`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className={styles.packageDiff}>
      <button
        className={styles.packageDiffToggle}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className={styles.toggleIcon}>›</span>
        <span className={styles.packageDiffSummary}>{summary} vs previous release</span>
      </button>
      {expanded && (
        <div className={styles.packageDiffTable}>
          {diff.added.length > 0 && (
            <section>
              <h4 className={`${styles.diffSectionTitle} ${styles.diffAdded}`}>
                Added ({diff.added.length})
              </h4>
              <table className={styles.diffTable}>
                <tbody>
                  {diff.added.map((e) => (
                    <tr key={e.name} className={styles.diffRowAdded}>
                      <td className={styles.diffPkgName}>{e.name}</td>
                      <td className={styles.diffVersion}>{e.newVersion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {diff.changed.length > 0 && (
            <section>
              <h4 className={`${styles.diffSectionTitle} ${styles.diffChanged}`}>
                Changed ({diff.changed.length})
              </h4>
              <table className={styles.diffTable}>
                <tbody>
                  {diff.changed.map((e) => (
                    <tr key={e.name} className={styles.diffRowChanged}>
                      <td className={styles.diffPkgName}>{e.name}</td>
                      <td className={styles.diffVersion}>
                        <span className={styles.diffOldVersion}>{e.oldVersion}</span>
                        <span className={styles.diffArrow}>→</span>
                        {e.newVersion}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {diff.removed.length > 0 && (
            <section>
              <h4 className={`${styles.diffSectionTitle} ${styles.diffRemoved}`}>
                Removed ({diff.removed.length})
              </h4>
              <table className={styles.diffTable}>
                <tbody>
                  {diff.removed.map((e) => (
                    <tr key={e.name} className={styles.diffRowRemoved}>
                      <td className={styles.diffPkgName}>{e.name}</td>
                      <td className={styles.diffVersion}>{e.oldVersion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const FirehoseCard: React.FC<FirehoseCardProps> = ({ app, defaultCollapsed = false }) => {
  const [showOlder, setShowOlder] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const latestRelease = app.releases?.[0];
  const olderReleases = app.releases?.slice(1) ?? [];

  // Version: prefer release title/version, fall back to currentReleaseVersion,
  // then homebrewInfo.versions[0] for apps with no tracked release history.
  const displayVersion =
    latestRelease?.title ||
    latestRelease?.version ||
    app.currentReleaseVersion ||
    app.homebrewInfo?.versions?.[0];

  // Date: prefer currentReleaseDate, then updatedAt
  const releaseDate = app.currentReleaseDate || app.updatedAt;

  // Primary link: flathub > release url > homebrewInfo.homepage > source repo
  const primaryHref =
    (app.flathubUrl || undefined) ||
    latestRelease?.url ||
    app.homebrewInfo?.homepage ||
    app.sourceRepo?.url;

  // Source icon link
  const sourceIconLink =
    app.sourceRepo?.type === "github" ? (
      <a
        href={app.sourceRepo.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.sourceIconLink}
        aria-label="Source on GitHub"
        title="View source on GitHub"
      >
        <FaGithub size={16} />
      </a>
    ) : app.sourceRepo?.type === "gitlab" ? (
      <a
        href={app.sourceRepo.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.sourceIconLink}
        aria-label="Source on GitLab"
        title="View source on GitLab"
      >
        <FaGitlab size={16} />
      </a>
    ) : null;

  // Flathub icon link
  const flathubIconLink =
    app.flathubUrl ? (
      <a
        href={app.flathubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.flathubIconLink}
        aria-label="Download on Flathub"
        title="Download on Flathub"
      >
        <SiFlathub size={16} />
      </a>
    ) : null;

  // Homebrew install command — prefer top-level formula, fall back to homebrewInfo
  const brewFormula = app.formula || app.homebrewInfo?.formula;
  const brewInstall =
    app.packageType === "homebrew" && brewFormula
      ? `brew install ${brewFormula}`
      : null;

  return (
    <article
      className={`${styles.groupedReleaseCard} ${styles.releaseCard}`}
      data-package-type={app.packageType}
    >
      <div className={styles.mainRelease}>
        {/* ── Header: icon + title section — clicking anywhere toggles collapsed ── */}
        <div
          className={`${styles.releaseHeader} ${collapsed ? styles.releaseHeaderCollapsed : ""} ${styles.releaseHeaderClickable}`}
          onClick={() => setCollapsed((v) => !v)}
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCollapsed((v) => !v); } }}
        >
          {app.icon ? (
            <img
              src={app.icon}
              alt={app.name}
              className={styles.releaseIcon}
              width={48}
              height={48}
              loading="lazy"
            />
          ) : (
            <span className={styles.releaseIconEmoji}>
              {app.packageType === "homebrew" ? "🍺" : app.packageType === "os" ? "🐧" : "📦"}
            </span>
          )}

          <div className={styles.releaseTitleSection}>
            <div className={styles.releaseNameRow}>
              {/* Name + version — left */}
              <h3 className={styles.releaseName}>
                {primaryHref ? (
                  <a href={primaryHref} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    {app.name}
                    {displayVersion && (
                      <span className={styles.versionInline}> {displayVersion}</span>
                    )}
                  </a>
                ) : (
                  <>
                    {app.name}
                    {displayVersion && (
                      <span className={styles.versionInline}> {displayVersion}</span>
                    )}
                  </>
                )}
              </h3>

              {/* Date + badge + icons — right */}
              <div className={styles.releaseMeta}>
                {releaseDate ? (
                  <span className={styles.releaseDate}>{formatDate(releaseDate)}</span>
                ) : (
                  <span className={styles.releaseDate} title="No release history tracked">
                    —
                  </span>
                )}
                <div className={styles.metaBadges} onClick={(e) => e.stopPropagation()}>
                  <PackageBadge type={app.packageType} />
                  {flathubIconLink}
                  {sourceIconLink}
                </div>
              </div>
            </div>
          </div>
          <span className={`${styles.collapseChevron} ${collapsed ? "" : styles.collapseChevronOpen}`} aria-hidden="true">›</span>
        </div>

        {/* ── Body (hidden when collapsed) ── */}
        {!collapsed && (
          <>
            {/* ── App ID (flatpak only) ── */}
            {app.packageType === "flatpak" && app.id && (
              <p className={styles.releaseAppId}>{app.id.replace(/^flatpak-/, "")}</p>
            )}

            {/* ── Homebrew install row ── */}
            {brewInstall && (
              <div className={styles.brewInstallRow}>
                <code className={styles.brewCommand}>{brewInstall}</code>
                <CopyButton command={brewInstall} />
              </div>
            )}

            {/* ── Summary ── */}
            {app.summary && (
              <p className={styles.releaseSummary}>{app.summary}</p>
            )}

            {/* ── OS package version chips ── */}
            {app.packageType === "os" && app.osInfo && (
              <div className={styles.releaseNotes}>
                <OsPackageChips
                  versions={{
                    fedora: app.osInfo.fedoraVersion ?? null,
                    kernel: app.osInfo.kernelVersion ?? null,
                    gnome: app.osInfo.gnomeVersion ?? null,
                    mesa: app.osInfo.mesaVersion ?? null,
                    podman: app.osInfo.majorPackages?.["Podman"] ?? null,
                    systemd: app.osInfo.majorPackages?.["systemd"] ?? null,
                    bootc: app.osInfo.majorPackages?.["bootc"] ?? null,
                  }}
                />
                {latestRelease?.packageDiff && (
                  <OsPackageDiff diff={latestRelease.packageDiff} />
                )}
                {latestRelease?.url && (
                  <a
                    href={latestRelease.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.releaseLink}
                  >
                    View Releases on GitHub →
                  </a>
                )}
              </div>
            )}

            {/* ── Release notes (non-OS) ── */}
            {app.packageType !== "os" && latestRelease?.description ? (
              <div className={styles.releaseNotes}>
                <div
                  className={styles.releaseDescription}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(latestRelease.description) }}
                />
                {latestRelease.url && (
                  <a
                    href={latestRelease.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.releaseLink}
                  >
                    View Full Release →
                  </a>
                )}
              </div>
            ) : app.packageType !== "os" && app.description && !latestRelease ? (
              /* For apps with no release history, show package description if available */
              <div className={styles.releaseNotes}>
                <p className={styles.releaseDescription}>{app.description}</p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ── Older releases ── */}
      {!collapsed && olderReleases.length > 0 && (
        <div className={styles.olderReleasesSection}>
          <button
            className={styles.olderReleasesToggle}
            onClick={() => setShowOlder((v) => !v)}
            aria-expanded={showOlder}
          >
            <span className={styles.toggleIcon}>›</span>
            {showOlder
              ? "Hide older releases"
              : `Show ${olderReleases.length} older release${olderReleases.length !== 1 ? "s" : ""}`}
          </button>
          {showOlder && (
            <div className={styles.olderReleasesList}>
              {olderReleases.map((release) => (
                <div key={release.version} className={styles.olderReleaseItem}>
                  <div className={styles.olderReleaseHeader}>
                    <span className={styles.olderReleaseVersion}>
                      {release.title || release.version}
                    </span>
                    <span className={styles.olderReleaseDate}>
                      {formatDate(release.date)}
                    </span>
                  </div>
                  {/* OS: show package chips + diff; others: show HTML description */}
                  {app.packageType === "os" && release.packageVersions ? (
                    <>
                      <OsPackageChips versions={release.packageVersions} />
                      {release.packageDiff && (
                        <OsPackageDiff diff={release.packageDiff} />
                      )}
                    </>
                  ) : release.description ? (
                    <div
                      className={styles.releaseDescription}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(release.description) }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default FirehoseCard;
