import React from "react";
import { createPortal } from "react-dom";
import styles from "./ArtworkGallery.module.css";

interface ShowcaseWallpaper {
  id: string;
  title: string;
  author: string;
  authorUrl?: string;
  coAuthor?: string;
  coAuthorUrl?: string;
  dayUrl: string;
  nightUrl?: string;
}

interface LightboxState {
  wallpaper: ShowcaseWallpaper;
  mode: "day" | "night";
}

export default function WallpaperShowcase({
  wallpapers,
}: {
  wallpapers: ShowcaseWallpaper[];
}): React.JSX.Element {
  const [lightbox, setLightbox] = React.useState<LightboxState | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") moveLightbox(1);
      if (e.key === "ArrowLeft") moveLightbox(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const moveLightbox = (dir: number) => {
    if (!lightbox) return;
    const idx = wallpapers.findIndex((w) => w.id === lightbox.wallpaper.id);
    const next = wallpapers[(idx + dir + wallpapers.length) % wallpapers.length];
    setLightbox({ wallpaper: next, mode: "day" });
  };

  const imgUrl = lightbox
    ? lightbox.mode === "night" && lightbox.wallpaper.nightUrl
      ? lightbox.wallpaper.nightUrl
      : lightbox.wallpaper.dayUrl
    : null;

  return (
    <>
      <div className={styles.grid}>
        {wallpapers.map((wp) => (
          <button
            key={wp.id}
            className={styles.thumbCard}
            onClick={() => setLightbox({ wallpaper: wp, mode: "day" })}
            aria-label={`View ${wp.title}`}
          >
            <img
              className={styles.thumb}
              src={wp.dayUrl}
              alt={wp.title}
              loading="lazy"
            />
            <div className={styles.cardMeta}>
              <strong>{wp.title}</strong>
              <div style={{ marginTop: "0.3rem", fontSize: "0.8rem", lineHeight: "1.5" }}>
                <span style={{ color: "var(--ifm-color-emphasis-600)" }}>by </span>
                {wp.authorUrl ? (
                  <a
                    href={wp.authorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontWeight: 600 }}
                  >
                    {wp.author}
                  </a>
                ) : (
                  <span style={{ fontWeight: 600 }}>{wp.author}</span>
                )}
                {wp.coAuthor && (
                  <>
                    <span style={{ color: "var(--ifm-color-emphasis-600)" }}> &amp; </span>
                    {wp.coAuthorUrl ? (
                      <a
                        href={wp.coAuthorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontWeight: 600 }}
                      >
                        {wp.coAuthor}
                      </a>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{wp.coAuthor}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {mounted &&
        lightbox &&
        imgUrl &&
        createPortal(
          <div
            className={styles.overlay}
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label={lightbox.wallpaper.title}
          >
            <div
              className={styles.lightboxInner}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.lightboxHeader}>
                <strong style={{ color: "#fff" }}>
                  {lightbox.wallpaper.title}
                </strong>
                {lightbox.wallpaper.nightUrl && (
                  <span className={styles.dayNightToggle}>
                    <button
                      onClick={() =>
                        setLightbox((s) => s && { ...s, mode: "day" })
                      }
                      style={{
                        fontWeight: lightbox.mode === "day" ? "bold" : "normal",
                        background: "none",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      ☀️ Day
                    </button>
                    <button
                      onClick={() =>
                        setLightbox((s) => s && { ...s, mode: "night" })
                      }
                      style={{
                        fontWeight:
                          lightbox.mode === "night" ? "bold" : "normal",
                        background: "none",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      🌙 Night
                    </button>
                  </span>
                )}
                <button
                  onClick={() => setLightbox(null)}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: "none",
                    color: "#fff",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                  }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className={styles.lightboxImageArea}>
                <button
                  className={`${styles.navBtn} ${styles.navPrev}`}
                  onClick={() => moveLightbox(-1)}
                  aria-label="Previous"
                >
                  ‹
                </button>
                <img
                  className={styles.lightboxImg}
                  src={imgUrl}
                  alt={lightbox.wallpaper.title}
                />
                <button
                  className={`${styles.navBtn} ${styles.navNext}`}
                  onClick={() => moveLightbox(1)}
                  aria-label="Next"
                >
                  ›
                </button>
              </div>
              <div className={styles.lightboxFooter}>
                <div>
                  <a className={styles.downloadLink} href={imgUrl} download>
                    ⬇ Download
                  </a>
                </div>
                <div>
                  <span style={{ color: "#ccc", fontSize: "0.85rem" }}>
                    {lightbox.wallpaper.authorUrl ? (
                      <a
                        href={lightbox.wallpaper.authorUrl}
                        style={{ color: "#8fd3ff", fontWeight: 600 }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {lightbox.wallpaper.author}
                      </a>
                    ) : (
                      <strong>{lightbox.wallpaper.author}</strong>
                    )}
                    {lightbox.wallpaper.coAuthor && (
                      <>
                        <span> &amp; </span>
                        {lightbox.wallpaper.coAuthorUrl ? (
                          <a
                            href={lightbox.wallpaper.coAuthorUrl}
                            style={{ color: "#8fd3ff", fontWeight: 600 }}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {lightbox.wallpaper.coAuthor}
                          </a>
                        ) : (
                          <strong>{lightbox.wallpaper.coAuthor}</strong>
                        )}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
