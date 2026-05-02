import React, { useState, useEffect } from "react";
import styles from "./MusicPlaylist.module.css";

interface MusicPlaylistProps {
  title: string;
  playlistId: string;
  /**
   * When true (default) an inline YouTube embed is rendered.
   * When false, renders a linked thumbnail + title only (suitable for email/RSS).
   */
  embed?: boolean;
}

interface PlaylistMetadata {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  description: string;
  playlistUrl: string;
}

/**
 * Extract playlist ID from various YouTube URL formats.
 * Supports:
 * - music.youtube.com/playlist?list=ID
 * - youtube.com/playlist?list=ID
 * - Direct playlist IDs (any format: PL, RD, UU, LL, WL, FL, etc.)
 */
const extractPlaylistId = (playlistIdOrUrl: string): string => {
  try {
    const url = new URL(playlistIdOrUrl);
    const listParam = url.searchParams.get("list");
    if (listParam) return listParam;
  } catch {
    // Not a valid URL — treat the value as a raw playlist ID.
  }
  return playlistIdOrUrl;
};

const MusicPlaylist: React.FC<MusicPlaylistProps> = ({
  title,
  playlistId,
  embed = true,
}) => {
  const cleanPlaylistId = extractPlaylistId(playlistId);
  const [metadata, setMetadata] = useState<PlaylistMetadata | null>(null);
  const [imageError, setImageError] = useState(false);
  /**
   * `mounted` is false during SSR / first paint so the YouTube iframe is never
   * included in the server-rendered HTML. It flips to true after the first
   * client-side render, allowing the iframe to mount without hydration mismatch.
   */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Metadata JSON is generated at build time and cached by the browser, so
    // multiple component instances share the same in-flight request automatically.
    fetch("/data/playlist-metadata.json")
      .then((res) => res.json())
      .then((data: PlaylistMetadata[]) => {
        const found = data.find((item) => item.id === cleanPlaylistId);
        if (found) setMetadata(found);
      })
      .catch((err) => {
        console.error("Error loading playlist metadata:", err);
      });
  }, [cleanPlaylistId]);

  const playlistUrl = `https://www.youtube.com/playlist?list=${cleanPlaylistId}`;
  const embedUrl = `https://www.youtube.com/embed/videoseries?list=${cleanPlaylistId}&autoplay=1&rel=0`;
  const thumbnailUrl = metadata?.thumbnailUrl ?? null;

  /** Thumbnail element — shared between both render branches */
  const thumbnailEl =
    thumbnailUrl && !imageError ? (
      <img
        src={thumbnailUrl}
        alt={title}
        className={styles.thumbnail}
        onError={() => setImageError(true)}
      />
    ) : (
      <div className={styles.thumbnailPlaceholder}>
        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.musicIcon}>
          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
        </svg>
      </div>
    );

  // ── embed=false fallback (email / RSS) ──────────────────────────────────
  if (!embed) {
    return (
      <div className={styles.nowPlayingBar}>
        <a
          href={playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.thumbnailWrapper}
          aria-label={`Open playlist: ${title}`}
        >
          {thumbnailEl}
        </a>
        <div className={styles.infoRow}>
          <span className={styles.label}>🎵 SOUNDTRACK</span>
          <a
            href={playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.playlistTitle}
          >
            {title}
          </a>
        </div>
      </div>
    );
  }

  // ── embed=true (default) — two-zone layout ──────────────────────────────
  return (
    <div className={styles.nowPlayingBar}>
      {/* Left zone: album thumbnail */}
      <div className={styles.thumbnailWrapper}>{thumbnailEl}</div>

      {/* Right zone: 16:9 video + info row */}
      <div className={styles.videoZone}>
        <div className={styles.videoContainer}>
          {mounted && (
            <iframe
              src={embedUrl}
              title={`${title} – YouTube playlist`}
              className={styles.videoIframe}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen={false}
            />
          )}
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>🎵 SOUNDTRACK</span>
          <span className={styles.playlistTitle}>{title}</span>
        </div>
      </div>
    </div>
  );
};

export default MusicPlaylist;
