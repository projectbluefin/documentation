import React, { useState, useEffect } from "react";
import styles from "./MusicPlaylist.module.css";

interface MusicPlaylistProps {
  title: string;
  playlistId: string;
  /** When true (default), clicking the listen button toggles an inline YouTube embed */
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
 * Extract playlist ID from various YouTube URL formats
 * Supports:
 * - music.youtube.com/playlist?list=ID
 * - youtube.com/playlist?list=ID
 * - Direct playlist IDs (any format: PL, RD, UU, LL, WL, FL, etc.)
 */
const extractPlaylistId = (playlistIdOrUrl: string): string => {
  // Try to extract from URL first
  try {
    const url = new URL(playlistIdOrUrl);
    const listParam = url.searchParams.get("list");
    if (listParam) {
      return listParam;
    }
  } catch {
    // Not a valid URL, assume it's already a playlist ID
    // This is expected behavior when passing playlist IDs directly
  }

  // Return as-is if it looks like a playlist ID (alphanumeric with common prefixes)
  // YouTube playlist IDs can start with PL, RD, UU, LL, WL, FL, etc.
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
  const [playerOpen, setPlayerOpen] = useState(false);

  useEffect(() => {
    // Load metadata from the build-time generated JSON file
    // Note: This fetch is cached by the browser, so multiple component instances
    // will efficiently share the same request. No need for additional memoization.
    fetch("/data/playlist-metadata.json")
      .then((response) => response.json())
      .then((data: PlaylistMetadata[]) => {
        const playlistData = data.find((item) => item.id === cleanPlaylistId);
        if (playlistData) {
          setMetadata(playlistData);
        }
      })
      .catch((error) => {
        console.error("Error loading playlist metadata:", error);
      });
  }, [cleanPlaylistId]);

  const playlistUrl = `https://www.youtube.com/playlist?list=${cleanPlaylistId}`;
  const embedUrl = `https://www.youtube.com/embed/videoseries?list=${cleanPlaylistId}`;
  const thumbnailUrl = metadata?.thumbnailUrl || null;

  const handleListenClick = () => {
    if (embed) {
      setPlayerOpen((prev) => !prev);
    } else {
      window.open(playlistUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={styles.nowPlayingBar}>
      {/* Thumbnail */}
      <div className={styles.thumbnailWrapper}>
        {thumbnailUrl && !imageError ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className={styles.thumbnail}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            {/* Music note icon */}
            <svg viewBox="0 0 24 24" fill="currentColor" className={styles.musicIcon}>
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <span className={styles.label}>🎵 Soundtrack</span>
        <span className={styles.playlistTitle}>{title}</span>
        {metadata?.description && (
          <span className={styles.description}>{metadata.description}</span>
        )}
      </div>

      {/* Action button */}
      <button
        type="button"
        className={styles.listenButton}
        onClick={handleListenClick}
        aria-expanded={embed ? playerOpen : undefined}
        aria-label={
          embed
            ? playerOpen
              ? "Close player"
              : "Listen on YouTube"
            : "Open playlist on YouTube"
        }
      >
        {embed ? (playerOpen ? "✕ Close player" : "▶ Listen") : "▶ Listen on YouTube"}
      </button>

      {/* Inline YouTube embed — animates open/close via CSS */}
      {embed && (
        <div
          className={`${styles.embedWrapper} ${playerOpen ? styles.embedOpen : ""}`}
          aria-hidden={!playerOpen}
        >
          {/* Only render the iframe once the player has been opened at least once,
              to avoid loading YouTube until the reader wants it */}
          {playerOpen && (
            <iframe
              src={embedUrl}
              title={`${title} – YouTube playlist`}
              className={styles.embedIframe}
              allow="autoplay; encrypted-media"
              allowFullScreen={false}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MusicPlaylist;
