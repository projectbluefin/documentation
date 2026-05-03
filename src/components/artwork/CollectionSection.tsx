import React from "react";
import Heading from "@theme/Heading";
import type { DayNightMode, Project, WallpaperCollection } from "./types";
import BrewInstallBlock from "./BrewInstallBlock";
import GalleryGrid from "./GalleryGrid";
import styles from "../ArtworkGallery.module.css";

interface CollectionSectionProps {
  collection: WallpaperCollection;
  collectionMode: DayNightMode;
  activeProject: Project;
  onSetMode: (project: Project, collectionId: string, mode: DayNightMode) => void;
  onOpenLightbox: (cardKey: string, project: Project, collectionId: string, wallpaperId: string) => void;
  cardButtonRefs: React.RefObject<Record<string, HTMLButtonElement | null>>;
}

export default function CollectionSection({
  collection,
  collectionMode,
  activeProject,
  onSetMode,
  onOpenLightbox,
  cardButtonRefs,
}: CollectionSectionProps): React.JSX.Element {
  return (
    <section>
      <div className={styles.collectionHeader}>
        <Heading as="h3" className={styles.collectionTitle}>
          {collection.title}
        </Heading>
        {collection.releaseUrl && (
          <a
            className={styles.releaseLink}
            href={collection.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Release assets ↗
          </a>
        )}
      </div>

      {collection.description && <p>{collection.description}</p>}

      {collection.brewCask && <BrewInstallBlock brewCask={collection.brewCask} />}

      {collection.hasDayNight && (
        <div className={styles.dayNightToggle} role="group" aria-label={`${collection.title} day and night toggle`}>
          <button
            type="button"
            className={`button button--sm ${collectionMode === "day" ? "button--primary" : "button--secondary"}`}
            aria-pressed={collectionMode === "day"}
            onClick={() => onSetMode(activeProject, collection.id, "day")}
          >
            Day
          </button>
          <button
            type="button"
            className={`button button--sm ${collectionMode === "night" ? "button--primary" : "button--secondary"}`}
            aria-pressed={collectionMode === "night"}
            onClick={() => onSetMode(activeProject, collection.id, "night")}
          >
            Night
          </button>
        </div>
      )}

      <GalleryGrid
        wallpapers={collection.wallpapers}
        collectionId={collection.id}
        collectionMode={collectionMode}
        activeProject={activeProject}
        onOpenLightbox={onOpenLightbox}
        cardButtonRefs={cardButtonRefs}
      />
    </section>
  );
}
