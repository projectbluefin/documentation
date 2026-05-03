import React from "react";
import type { DayNightMode, Project, Wallpaper } from "./types";
import { cardLabel, displayTitle, getFullResolutionUrl, getPreferredImageUrl } from "./utils";
import CreditDisplay from "./CreditDisplay";
import styles from "../ArtworkGallery.module.css";

interface ThumbCardProps {
  wallpaper: Wallpaper;
  collectionId: string;
  collectionMode: DayNightMode;
  activeProject: Project;
  cardKey: string;
  onOpenLightbox: (cardKey: string, project: Project, collectionId: string, wallpaperId: string) => void;
  cardButtonRef: (element: HTMLButtonElement | null) => void;
}

export default function ThumbCard({
  wallpaper,
  collectionId,
  collectionMode,
  activeProject,
  cardKey,
  onOpenLightbox,
  cardButtonRef,
}: ThumbCardProps): React.JSX.Element {
  const title = displayTitle(wallpaper.title);
  const label = cardLabel(collectionId, wallpaper.id, wallpaper.title);

  if (!wallpaper.hasLightbox) {
    const nonLightboxUrl = wallpaper.jxlUrl ?? getFullResolutionUrl(wallpaper, collectionMode);
    const previewSrcNonLightbox = getPreferredImageUrl(wallpaper, collectionMode);
    const thumbContent = previewSrcNonLightbox ? (
      <img
        src={previewSrcNonLightbox}
        alt={title}
        className={styles.thumb}
        loading="lazy"
        decoding="async"
      />
    ) : (
      <div className={styles.thumbPlaceholder}><span>{title}</span></div>
    );

    if (!nonLightboxUrl) {
      return (
        <div className={styles.thumbCard}>
          {thumbContent}
          <div className={styles.cardMeta}>
            <strong>{label}</strong>
            <div className={styles.creditLine}><CreditDisplay wallpaper={wallpaper} /></div>
          </div>
        </div>
      );
    }

    return (
      <a
        href={nonLightboxUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${title} — opens in new tab`}
        className={styles.thumbCard}
        title="Opens in a new tab — use your browser's Save As to download"
      >
        {thumbContent}
        <div className={styles.cardMeta}>
          <strong>{label}</strong>
          <div className={styles.creditLine}><CreditDisplay wallpaper={wallpaper} /></div>
        </div>
      </a>
    );
  }

  const previewSrc = getPreferredImageUrl(wallpaper, collectionMode);
  return (
    <button
      type="button"
      className={styles.thumbCard}
      onClick={() => onOpenLightbox(cardKey, activeProject, collectionId, wallpaper.id)}
      ref={cardButtonRef}
    >
      {previewSrc ? (
        <img
          className={styles.thumb}
          src={previewSrc}
          alt={title}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={styles.thumbPlaceholder}>
          <span>{title}</span>
        </div>
      )}
      <div className={styles.cardMeta}>
        <strong>{label}</strong>
        <div className={styles.creditLine}><CreditDisplay wallpaper={wallpaper} /></div>
      </div>
    </button>
  );
}
