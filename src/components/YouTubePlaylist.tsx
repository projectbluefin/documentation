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
 * - Direct playlist IDs
 */
const extractPlaylistId = (playlistIdOrUrl: string): string => {
  // If it's already just an ID (starts with PL), return it
  if (playlistIdOrUrl.startsWith("PL")) {
    return playlistIdOrUrl;
  }

  // Try to extract from URL
  try {
    const url = new URL(playlistIdOrUrl);
    const listParam = url.searchParams.get("list");
    if (listParam) {
      return listParam;
    }
  } catch (e) {
    // Not a valid URL, might be just an ID
  }

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
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default YouTubePlaylist;
