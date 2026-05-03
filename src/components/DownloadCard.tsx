import React from "react";
import styles from "./DownloadCard.module.css";

export interface DownloadEntry {
  label: string;
  isoUrl: string;
  isoFilename: string;
  torrentUrl?: string;
  checksumUrl: string;
}

export interface EntryGroup {
  label: string;
  entries: DownloadEntry[];
}

export interface DownloadCardProps {
  variant: "bluefin" | "bluefin-lts" | "bluefin-gdx" | "dakotaraptor";
  title: string;
  description: React.ReactNode;
  entries: DownloadEntry[];
  sections?: EntryGroup[];
  recommended?: boolean;
}

const VARIANT_CLASS: Record<DownloadCardProps["variant"], string> = {
  "bluefin":      styles.cardBluefin,
  "bluefin-lts":  styles.cardLts,
  "bluefin-gdx":  styles.cardGdx,
  "dakotaraptor": styles.cardDakota,
};

const LOGO_MAP: Record<string, { src: string; alt: string }> = {
  amd:     { src: "/img/gpu/amd.svg",    alt: "AMD" },
  intel:   { src: "/img/gpu/intel.svg",  alt: "Intel" },
  nvidia:  { src: "/img/gpu/nvidia.svg", alt: "NVIDIA" },
  arm:     { src: "/img/gpu/arm.svg",    alt: "ARM" },
  aarch64: { src: "/img/gpu/arm.svg",    alt: "ARM" },
};

function logoForPart(part: string) {
  const key = Object.keys(LOGO_MAP).find((k) => new RegExp(k, "i").test(part));
  return key ? LOGO_MAP[key] : null;
}

function GpuLabel({ label }: { label: string }) {
  const parts = label.split(" / ");
  return (
    <div className={styles.gpuLabel}>
      {parts.map((part) => {
        const logo = logoForPart(part);
        return (
          <span key={part} className={styles.gpuLine}>
            {logo && <img src={logo.src} alt={logo.alt} className={styles.gpuLogo} />}
            <span>{part}</span>
          </span>
        );
      })}
    </div>
  );
}

function EntryRow({ entry }: { entry: DownloadEntry }) {
  return (
    <div className={styles.entry}>
      <div className={styles.entryFilename}>
        <span className={styles.isoName}>{entry.isoFilename}</span>
      </div>
      <div className={styles.entryGpu}>
        <GpuLabel label={entry.label} />
      </div>
      <div className={styles.entryButtons}>
        <a
          href={entry.isoUrl}
          download={entry.isoFilename}
          className={styles.downloadButton}
        >
          📥 Download ISO
        </a>
        {entry.torrentUrl ? (
          <a href={entry.torrentUrl} className={styles.secondaryLink}>
            🧲 Torrent
          </a>
        ) : (
          <span className={styles.secondaryLinkDisabled}>
            🧲 Torrent
          </span>
        )}
        <a href={entry.checksumUrl} className={styles.secondaryLink}>
          🔐 Verify
        </a>
      </div>
    </div>
  );
}

const DownloadCard: React.FC<DownloadCardProps> = ({ variant, title, description, entries, sections, recommended }) => (
  <article className={`${styles.card} ${VARIANT_CLASS[variant]}`}>
    <div className={styles.cardHeader}>
      <div className={styles.titleRow}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {recommended && <span className={styles.recommendedBadge}>Recommended</span>}
      </div>
      <p className={styles.cardDescription}>{description}</p>
    </div>

    <div className={styles.entries}>
      {entries.map((entry) => (
        <EntryRow key={entry.label} entry={entry} />
      ))}
      {sections?.map((section) => (
        <div key={section.label} className={styles.section}>
          <div className={styles.sectionLabel}>{section.label}</div>
          {section.entries.map((entry) => (
            <EntryRow key={entry.label} entry={entry} />
          ))}
        </div>
      ))}
    </div>
  </article>
);

export default DownloadCard;
