import React, { useState, useCallback } from "react";
import { SiFlathub } from "react-icons/si";
import { FaGithub, FaGitlab, FaCopy, FaCheck } from "react-icons/fa";
import type { FirehoseApp, FirehoseRelease } from "../types/firehose";
import styles from "./FirehoseCard.module.css";

interface FirehoseCardProps {
  app: FirehoseApp;
  release: FirehoseRelease;
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
    type === "flatpak" ? "Flathub" : type === "homebrew" ? "Homebrew" : "OS Release";
  return <span className={`${styles.badge} ${styles[`badge_${type}`]}`}>{label}</span>;
}

function AppIcon({ app }: { app: FirehoseApp }) {
  if (app.icon) {
    return (
      <img
        src={app.icon}
        alt={app.name}
        className={styles.appIcon}
        width={48}
        height={48}
        loading="lazy"
      />
    );
  }
  const emoji = app.packageType === "homebrew" ? "🍺" : "🐧";
  return <span className={styles.appIconEmoji}>{emoji}</span>;
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
      className={styles.copyBtn}
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy install command"}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
    </button>
  );
}

const FirehoseCard: React.FC<FirehoseCardProps> = ({ app, release }) => {
  const sourceIcon =
    app.sourceRepo?.type === "github" ? (
      <a
        href={app.sourceRepo.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.iconLink}
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
        className={styles.iconLink}
        aria-label="Source on GitLab"
        title="View source on GitLab"
      >
        <FaGitlab size={16} />
      </a>
    ) : null;

  const flathubIcon = app.flathubUrl ? (
    <a
      href={app.flathubUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.iconLink}
      aria-label="Download on Flathub"
      title="Download on Flathub"
    >
      <SiFlathub size={16} />
    </a>
  ) : null;

  const brewInstall =
    app.packageType === "homebrew" && app.formula
      ? `brew install ${app.formula}`
      : null;

  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <AppIcon app={app} />
        <div className={styles.appMeta}>
          <div className={styles.appTitleRow}>
            <span className={styles.appName}>{app.name}</span>
            <span className={styles.version}>
              {release.title || release.version}
            </span>
            <span className={styles.date}>{formatDate(release.date)}</span>
            <PackageBadge type={app.packageType} />
          </div>
          <div className={styles.appLinks}>
            {flathubIcon}
            {sourceIcon}
          </div>
        </div>
      </header>

      {brewInstall && (
        <div className={styles.brewInstall}>
          <code>{brewInstall}</code>
          <CopyButton command={brewInstall} />
        </div>
      )}

      {app.summary && <p className={styles.summary}>{app.summary}</p>}

      {release.description && (
        <div
          className={styles.releaseBody}
          dangerouslySetInnerHTML={{ __html: release.description }}
        />
      )}
    </article>
  );
};

export default FirehoseCard;
