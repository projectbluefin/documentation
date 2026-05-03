import React from "react";
import { createPortal } from "react-dom";
import styles from "./ArtworkGallery.module.css";
import {
  CollectionSection,
  LightboxDialog,
  ProjectSwitcher,
} from "./artwork";
import type {
  ArtworkManifest,
  DayNightMode,
  LightboxContext,
  Project,
} from "./artwork";

export default function ArtworkGallery(): React.JSX.Element {
  const [manifest, setManifest] = React.useState<ArtworkManifest | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [activeProject, setActiveProject] = React.useState<Project>("bluefin");
  const [isMounted, setIsMounted] = React.useState(false);
  const [dayNightByCollection, setDayNightByCollection] = React.useState<Record<string, DayNightMode>>(
    {},
  );
  const [lightbox, setLightbox] = React.useState<{
    project: Project;
    collectionId: string;
    wallpaperId: string;
  } | null>(null);
  const cardButtonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const lastOpenedCardKeyRef = React.useRef<string | null>(null);

  // SSR guard for portal — only mount the lightbox portal after hydration
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    fetch("/data/artwork.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted) return;
        if (data && typeof data === "object" && data.projects) {
          setManifest(data as ArtworkManifest);
          setLoadError(null);
        } else {
          setManifest(null);
          setLoadError("Artwork data is currently unavailable.");
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setManifest(null);
        setLoadError("Artwork data is currently unavailable.");
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeProjectData = manifest?.projects?.[activeProject] ?? null;

  const lightboxContext: LightboxContext | null = React.useMemo(() => {
    if (!manifest || !lightbox) {
      return null;
    }

    const projectData = manifest.projects[lightbox.project];
    const collection = projectData.collections.find((item) => item.id === lightbox.collectionId);
    if (!collection) {
      return null;
    }

    const lightboxWallpapers = collection.wallpapers.filter((item) => item.hasLightbox);
    const index = lightboxWallpapers.findIndex((item) => item.id === lightbox.wallpaperId);
    if (index < 0) {
      return null;
    }

    return {
      projectData,
      collection,
      wallpaper: lightboxWallpapers[index],
      lightboxWallpapers,
      index,
    };
  }, [manifest, lightbox]);

  React.useEffect(() => {
    if (lightbox && !lightboxContext) {
      setLightbox(null);
    }
  }, [lightbox, lightboxContext]);

  const moveLightbox = React.useCallback(
    (direction: -1 | 1) => {
      if (!lightboxContext) {
        return;
      }

      const total = lightboxContext.lightboxWallpapers.length;
      if (total < 2) {
        return;
      }

      const nextIndex = (lightboxContext.index + direction + total) % total;
      const nextWallpaper = lightboxContext.lightboxWallpapers[nextIndex];
      setLightbox((current) =>
        current
          ? {
              ...current,
              wallpaperId: nextWallpaper.id,
            }
          : current,
      );
    },
    [lightboxContext],
  );

  React.useEffect(() => {
    if (!lightbox) {
      return;
    }

    const appRoot = document.getElementById("__docusaurus");
    const appRootAlreadyInert = appRoot?.hasAttribute("inert") ?? false;

    if (appRoot && !appRootAlreadyInert) {
      appRoot.setAttribute("inert", "");
    }
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
      if (appRoot && !appRootAlreadyInert) {
        appRoot.removeAttribute("inert");
      }
      const restoreKey = lastOpenedCardKeyRef.current;
      if (restoreKey) {
        cardButtonRefs.current[restoreKey]?.focus();
      }
    };
  }, [lightbox]);

  React.useEffect(() => {
    if (!lightbox || !lightboxContext) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setLightbox(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveLightbox(-1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveLightbox(1);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
      );

      if (focusableElements.length === 0) {
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightbox, lightboxContext, moveLightbox]);

  const setCollectionMode = React.useCallback(
    (project: Project, collectionId: string, mode: DayNightMode) => {
      const key = `${project}:${collectionId}`;
      setDayNightByCollection((current) => ({
        ...current,
        [key]: mode,
      }));
    },
    [],
  );

  const getCollectionMode = React.useCallback(
    (project: Project, collectionId: string): DayNightMode => {
      const key = `${project}:${collectionId}`;
      return dayNightByCollection[key] ?? "day";
    },
    [dayNightByCollection],
  );

  const switchProject = React.useCallback((project: Project) => {
    setActiveProject(project);
    setLightbox(null);
  }, []);

  const openLightbox = React.useCallback(
    (cardKey: string, project: Project, collectionId: string, wallpaperId: string) => {
      lastOpenedCardKeyRef.current = cardKey;
      setLightbox({ project, collectionId, wallpaperId });
    },
    [],
  );

  const closeLightbox = React.useCallback(() => {
    setLightbox(null);
  }, []);

  if (isLoading) {
    return <div className={styles.galleryPage}>Loading artwork catalog...</div>;
  }

  if (loadError || !activeProjectData) {
    return (
      <div className={styles.galleryPage}>
        <div className="alert alert--warning" role="alert">
          {loadError ?? "Artwork data is currently unavailable."}
        </div>
      </div>
    );
  }

  const lightboxMode =
    lightboxContext && lightboxContext.collection.hasDayNight
      ? getCollectionMode(lightbox?.project ?? activeProject, lightboxContext.collection.id)
      : "day";

  return (
    <div className={styles.galleryPage}>
      <div className={styles.projectSwitcher}>
        <ProjectSwitcher
          manifest={manifest}
          activeProject={activeProject}
          onSwitch={switchProject}
        />
      </div>

      {activeProjectData.collections.map((collection) => {
        const collectionMode = getCollectionMode(activeProject, collection.id);
        const collectionKey = `${activeProject}:${collection.id}`;
        return (
          <CollectionSection
            key={collectionKey}
            collection={collection}
            collectionMode={collectionMode}
            activeProject={activeProject}
            onSetMode={setCollectionMode}
            onOpenLightbox={openLightbox}
            cardButtonRefs={cardButtonRefs}
          />
        );
      })}

      {lightboxContext && isMounted && createPortal(
        <LightboxDialog
          lightboxContext={lightboxContext}
          lightboxProject={lightbox?.project ?? activeProject}
          lightboxMode={lightboxMode}
          dialogRef={dialogRef}
          closeButtonRef={closeButtonRef}
          onClose={closeLightbox}
          onMove={moveLightbox}
          onSetMode={setCollectionMode}
        />,
        document.body
      )}
    </div>
  );
}
