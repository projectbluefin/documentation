import React from "react";
import { createPortal } from "react-dom";
import Heading from "@theme/Heading";
import styles from "./ArtworkGallery.module.css";

interface ArtworkManifest {
  generatedAt: string;
  projects: {
    bluefin: ProjectData;
    bazzite: ProjectData;
    aurora: ProjectData;
  };
}

interface ProjectData {
  label: string;
  sourceUrl: string;
  collections: WallpaperCollection[];
}

interface WallpaperCollection {
  id: string;
  title: string;
  description: string;
  license: string;
  releaseUrl: string | null;
  hasDayNight: boolean;
  brewCask: string | null;
  wallpapers: Wallpaper[];
}

interface Wallpaper {
  id: string;
  title: string | null;
  author: string | null;
  authorLicense: string | null;
  previewUrl: string | null;
  previewNightUrl: string | null;
  dayUrl: string | null;
  nightUrl: string | null;
  jxlUrl: string | null;
  primaryFormat: "png" | "jpg" | "svg" | null;
  hasLightbox: boolean;
}

type Project = "bluefin" | "bazzite" | "aurora";
type DayNightMode = "day" | "night";

function displayTitle(title: string | null): string {
  return title ?? "[ Redacted ]";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function cardLabel(collectionId: string, wallpaperId: string, title: string | null): string {
  if (collectionId === "bluefin-monthly") {
    const match = wallpaperId.match(/^bluefin-(\d{2})$/);
    if (match) {
      const month = parseInt(match[1], 10);
      if (month >= 1 && month <= 12) {
        const titlePart = title ?? "[ Redacted ]";
        return `${MONTH_NAMES[month - 1]} - ${titlePart}`;
      }
    }
  }
  return displayTitle(title);
}

function CreditDisplay({ wallpaper }: { wallpaper: Wallpaper }): React.JSX.Element {
  if (!wallpaper.author) {
    return <span>Author unknown</span>;
  }
  if (wallpaper.authorLicense?.startsWith("http")) {
    return (
      <a href={wallpaper.authorLicense} target="_blank" rel="noopener noreferrer">
        {wallpaper.author}
      </a>
    );
  }
  if (wallpaper.authorLicense) {
    return <span>{wallpaper.author} · {wallpaper.authorLicense}</span>;
  }
  return <span>{wallpaper.author}</span>;
}

function getPreferredImageUrl(wallpaper: Wallpaper, mode: DayNightMode): string | null {
  if (mode === "night" && wallpaper.previewNightUrl) {
    return wallpaper.previewNightUrl;
  }
  if (wallpaper.previewUrl) {
    return wallpaper.previewUrl;
  }
  if (mode === "night") {
    return wallpaper.nightUrl ?? wallpaper.dayUrl;
  }
  return wallpaper.dayUrl ?? wallpaper.nightUrl;
}

function getFullResolutionUrl(wallpaper: Wallpaper, mode: DayNightMode): string | null {
  if (mode === "night" && wallpaper.nightUrl) {
    return wallpaper.nightUrl;
  }
  return wallpaper.dayUrl ?? wallpaper.nightUrl;
}

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

  const lightboxContext = React.useMemo(() => {
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
  const lightboxImageUrl = lightboxContext
    ? (getFullResolutionUrl(lightboxContext.wallpaper, lightboxMode) ?? lightboxContext.wallpaper.previewUrl)
    : null;
  const lightboxTitle = lightboxContext ? displayTitle(lightboxContext.wallpaper.title) : "";

  return (
    <div className={styles.galleryPage}>
      <div className={styles.projectSwitcher} role="tablist" aria-label="Artwork projects">
        {(["bluefin", "bazzite", "aurora"] as Project[]).map((project) => {
          const isActive = activeProject === project;
          const label = manifest?.projects?.[project]?.label ?? project;
          return (
            <button
              key={project}
              type="button"
              className={`button ${isActive ? "button--primary" : "button--secondary"}`}
              aria-pressed={isActive}
              onClick={() => switchProject(project)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeProjectData.collections.map((collection) => {
        const collectionMode = getCollectionMode(activeProject, collection.id);
        const collectionKey = `${activeProject}:${collection.id}`;
        return (
          <section key={collectionKey}>
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

            {collection.brewCask && (
              <div className={styles.brewInstall}>
                <code className={styles.brewCmd}>brew install --cask {collection.brewCask}</code>
              </div>
            )}

            {collection.hasDayNight && (
              <div className={styles.dayNightToggle} role="group" aria-label={`${collection.title} day and night toggle`}>
                <button
                  type="button"
                  className={`button button--sm ${collectionMode === "day" ? "button--primary" : "button--secondary"}`}
                  aria-pressed={collectionMode === "day"}
                  onClick={() => setCollectionMode(activeProject, collection.id, "day")}
                >
                  Day
                </button>
                <button
                  type="button"
                  className={`button button--sm ${collectionMode === "night" ? "button--primary" : "button--secondary"}`}
                  aria-pressed={collectionMode === "night"}
                  onClick={() => setCollectionMode(activeProject, collection.id, "night")}
                >
                  Night
                </button>
              </div>
            )}

            <div className={styles.grid}>
              {collection.wallpapers.map((wallpaper) => {
                const title = displayTitle(wallpaper.title);
                const label = cardLabel(collection.id, wallpaper.id, wallpaper.title);
                const cardKey = `${activeProject}:${collection.id}:${wallpaper.id}`;

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
                      <div key={cardKey} className={styles.thumbCard}>
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
                      key={cardKey}
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
                    key={cardKey}
                    type="button"
                    className={styles.thumbCard}
                    onClick={() => {
                      lastOpenedCardKeyRef.current = cardKey;
                      setLightbox({
                        project: activeProject,
                        collectionId: collection.id,
                        wallpaperId: wallpaper.id,
                      });
                    }}
                    ref={(element) => {
                      cardButtonRefs.current[cardKey] = element;
                    }}
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
              })}
            </div>
          </section>
        );
      })}

      {lightboxContext && isMounted && createPortal(
        <div className={styles.overlay} onClick={() => setLightbox(null)}>
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
              {lightboxContext.collection.hasDayNight && lightbox?.project ? (
                <div className={styles.dayNightToggle} role="group" aria-label="Lightbox day and night toggle">
                  <button
                    type="button"
                    className={`button button--sm ${lightboxMode === "day" ? "button--primary" : "button--secondary"}`}
                    aria-pressed={lightboxMode === "day"}
                    onClick={() => setCollectionMode(lightbox.project, lightboxContext.collection.id, "day")}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    className={`button button--sm ${lightboxMode === "night" ? "button--primary" : "button--secondary"}`}
                    aria-pressed={lightboxMode === "night"}
                    onClick={() => setCollectionMode(lightbox.project, lightboxContext.collection.id, "night")}
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
                onClick={() => setLightbox(null)}
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
                    onClick={() => moveLightbox(-1)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className={`${styles.navBtn} ${styles.navNext}`}
                    aria-label="Next"
                    onClick={() => moveLightbox(1)}
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
        </div>,
        document.body
      )}
    </div>
  );
}
