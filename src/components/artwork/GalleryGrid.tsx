import React from "react";
import type { DayNightMode, Project, Wallpaper } from "./types";
import ThumbCard from "./ThumbCard";
import styles from "../ArtworkGallery.module.css";

interface GalleryGridProps {
  wallpapers: Wallpaper[];
  collectionId: string;
  collectionMode: DayNightMode;
  activeProject: Project;
  onOpenLightbox: (cardKey: string, project: Project, collectionId: string, wallpaperId: string) => void;
  cardButtonRefs: React.RefObject<Record<string, HTMLButtonElement | null>>;
}

export default function GalleryGrid({
  wallpapers,
  collectionId,
  collectionMode,
  activeProject,
  onOpenLightbox,
  cardButtonRefs,
}: GalleryGridProps): React.JSX.Element {
  return (
    <div className={styles.grid}>
      {wallpapers.map((wallpaper) => {
        const cardKey = `${activeProject}:${collectionId}:${wallpaper.id}`;
        return (
          <ThumbCard
            key={cardKey}
            wallpaper={wallpaper}
            collectionId={collectionId}
            collectionMode={collectionMode}
            activeProject={activeProject}
            cardKey={cardKey}
            onOpenLightbox={onOpenLightbox}
            cardButtonRef={(element) => {
              cardButtonRefs.current[cardKey] = element;
            }}
          />
        );
      })}
    </div>
  );
}
