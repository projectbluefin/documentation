import React from "react";
import styles from "./YouTubePlaylist.module.css";

interface YouTubePlaylistProps {
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
  } catch (e) {
    // Not a valid URL, assume it's already a playlist ID
  }

  // Return as-is if it looks like a playlist ID (alphanumeric with common prefixes)
  // YouTube playlist IDs can start with PL, RD, UU, LL, WL, FL, etc.
  return playlistIdOrUrl;
};

const YouTubePlaylist: React.FC<YouTubePlaylistProps> = ({
  title,
  playlistId,
}) => {
  const cleanPlaylistId = extractPlaylistId(playlistId);

  return (
    <div className={styles.playlistContainer}>
      <h4 className={styles.playlistTitle}>{title}</h4>
      <div className={styles.iframeWrapper}>
        <iframe
          className={styles.playlistIframe}
          src={`https://www.youtube.com/embed/videoseries?list=${cleanPlaylistId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default YouTubePlaylist;
