import React from "react";
import styles from "./DocsFeatureGrid.module.css";

// Render inline markdown links [text](url) as <a> elements.
// Use literal \n in body strings to insert line breaks between sentences.
function renderMarkdownLinks(text: string): React.ReactNode[] {
  const paragraphs = text.split("\\n");
  return paragraphs.flatMap((para, pi) => {
    const parts = para.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
      const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) {
        return (
          <a key={`${pi}-${i}`} href={m[2]} target="_blank" rel="noopener noreferrer">
            {m[1]}
          </a>
        );
      }
      return part;
    });
    return pi === 0 ? parts : [<br key={`br-${pi}`} />, ...parts];
  });
}

interface WallpaperEntry {
  id: string;
  title: string;
  author: string;
  authorUrl?: string;
  coAuthor?: string;
  coAuthorUrl?: string;
  dayUrl: string;
  nightUrl?: string;
  body?: string;
}

const WallpaperFeatureGrid: React.FC<{ wallpapers: WallpaperEntry[] }> = ({
  wallpapers,
}) => (
  <div className={styles.list}>
    {wallpapers.map((w) => (
      <div key={w.id} className={styles.row}>
        <div className={styles.textSide}>
          <span className={styles.title}>{w.title}</span>
          <p className={styles.description}>
            {"by "}
            {w.authorUrl ? (
              <a href={w.authorUrl} target="_blank" rel="noopener noreferrer">
                {w.author}
              </a>
            ) : (
              w.author
            )}
            {w.coAuthor && (
              <>
                {" and "}
                {w.coAuthorUrl ? (
                  <a href={w.coAuthorUrl} target="_blank" rel="noopener noreferrer">
                    {w.coAuthor}
                  </a>
                ) : (
                  w.coAuthor
                )}
              </>
            )}
          </p>
          {w.body && <p className={styles.body}>{renderMarkdownLinks(w.body)}</p>}
        </div>
        <a
          href={w.dayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.thumbSide}
          aria-label={`View ${w.title} wallpaper`}
        >
          <img src={w.dayUrl} alt={w.title} loading="lazy" />
        </a>
      </div>
    ))}
  </div>
);

export default WallpaperFeatureGrid;
