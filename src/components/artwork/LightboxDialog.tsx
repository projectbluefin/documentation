import React from "react";
import type { DayNightMode, Project, ProjectData, Wallpaper, WallpaperCollection } from "./types";
import { displayTitle, getFullResolutionUrl } from "./utils";
import CreditDisplay from "./CreditDisplay";
import styles from "../ArtworkGallery.module.css";

export interface LightboxContext {
  projectData: ProjectData;
  collection: WallpaperCollection;
  wallpaper: Wallpaper;
  lightboxWallpapers: Wallpaper[];
  index: number;
}

interface LightboxDialogProps {
  lightboxContext: LightboxContext;
  lightboxProject: Project;
  lightboxMode: DayNightMode;
  dialogRef: React.RefObject<HTMLDivElement | null>;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onMove: (direction: -1 | 1) => void;
  onSetMode: (project: Project, collectionId: string, mode: DayNightMode) => void;
}

export default function LightboxDialog({
  lightboxContext,
  lightboxProject,
  lightboxMode,
  dialogRef,
  closeButtonRef,
  onClose,
  onMove,
  onSetMode,
}: LightboxDialogProps): React.JSX.Element {
  const lightboxImageUrl =
    getFullResolutionUrl(lightboxContext.wallpaper, lightboxMode) ?? lightboxContext.wallpaper.previewUrl;
  const lightboxTitle = displayTitle(lightboxContext.wallpaper.title);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.lightboxInner}
        role="dialog"
        aria-modal="true"
        aria-label="Wallpaper viewer"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header row: day/night toggle (left) + close button (right) */}
        <div className={styles.lightboxHeader}>
          {lightboxContext.collection.hasDayNight ? (
            <div className={styles.dayNightToggle} role="group" aria-label="Lightbox day and night toggle">
              <button
                type="button"
                className={`button button--sm ${lightboxMode === "day" ? "button--primary" : "button--secondary"}`}
                aria-pressed={lightboxMode === "day"}
                onClick={() => onSetMode(lightboxProject, lightboxContext.collection.id, "day")}
              >
                Day
              </button>
              <button
                type="button"
                className={`button button--sm ${lightboxMode === "night" ? "button--primary" : "button--secondary"}`}
                aria-pressed={lightboxMode === "night"}
                onClick={() => onSetMode(lightboxProject, lightboxContext.collection.id, "night")}
              >
                Night
              </button>
            </div>
          ) : (
            <span />
          )}
          <button
            ref={closeButtonRef}
            type="button"
            className="button button--secondary button--sm"
            onClick={onClose}
          >
            Close ×
          </button>
        </div>

        {/* Image area — fills remaining space */}
        <div className={styles.lightboxImageArea}>
          {lightboxContext.lightboxWallpapers.length > 1 && (
            <>
              <button
                type="button"
                className={`${styles.navBtn} ${styles.navPrev}`}
                aria-label="Previous"
                onClick={() => onMove(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                className={`${styles.navBtn} ${styles.navNext}`}
                aria-label="Next"
                onClick={() => onMove(1)}
              >
                ›
              </button>
            </>
          )}
          {lightboxImageUrl ? (
            <img
              className={styles.lightboxImg}
              src={lightboxImageUrl}
              alt={lightboxTitle}
            />
          ) : (
            <div className={styles.thumbPlaceholder}>
              <span>{lightboxTitle}</span>
            </div>
          )}
        </div>

        {/* Footer: title, credit, download links */}
        <div className={styles.lightboxFooter}>
          <div>
            <strong>{lightboxTitle}</strong>
            <div className={styles.creditLine}><CreditDisplay wallpaper={lightboxContext.wallpaper} /></div>
          </div>
          <div>
            {lightboxImageUrl && (
              <a
                className={styles.downloadLink}
                href={lightboxImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Opens in a new tab — use your browser's Save As to download"
              >
                Open full resolution ↗
              </a>
            )}
            {lightboxContext.wallpaper.jxlUrl && (
              <a
                className={styles.jxlLink}
                href={lightboxContext.wallpaper.jxlUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Opens in a new tab — use your browser's Save As to download"
              >
                JXL ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
