import React from "react";
import styles from "./MusicPlaylist.module.css";

interface MusicPlaylistProps {
  title: string;
  playlistId: string;
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

  return (
    <div className={styles.playlistBox}>
      <h4 className={styles.playlistTitle}>{title}</h4>
      <div className={styles.embedWrapper}>
        <iframe
          className={styles.embedIframe}
          src={`https://music.youtube.com/embed/playlist?list=${cleanPlaylistId}`}
          title={title}
          allow="clipboard-write; encrypted-media; picture-in-picture"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default MusicPlaylist;
