import React, { useState, useEffect } from "react";
import styles from "./MusicPlaylist.module.css";

interface MusicPlaylistProps {
  title: string;
  playlistId: string;
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

const MusicPlaylist: React.FC<MusicPlaylistProps> = ({ title, playlistId }) => {
  const cleanPlaylistId = extractPlaylistId(playlistId);
  const [metadata, setMetadata] = useState<PlaylistMetadata | null>(null);
  const [imageError, setImageError] = useState(false);

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
  const thumbnailUrl = metadata?.thumbnailUrl || null;

  return (
    <div className={styles.playlistBox}>
      <a
        href={playlistUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.playlistLink}
      >
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
              <svg
                className={styles.playIcon}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
          <div className={styles.playOverlay}>
            <svg
              className={styles.playIconLarge}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </a>
      <div className={styles.playlistInfo}>
        <h4 className={styles.playlistTitle}>
          <a
            href={playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.titleLink}
          >
            {title}
          </a>
        </h4>
        {metadata?.description && (
          <p className={styles.playlistDescription}>{metadata.description}</p>
        )}
      </div>
    </div>
  );
};

export default MusicPlaylist;
