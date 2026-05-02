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
  const [mounted, setMounted] = useState(false);
  /** Once true, the iframe is rendered with autoplay=1 (requires user gesture) */
  const [playing, setPlaying] = useState(false);
  /** Whether the user has scrolled past the top of the page */
  const [hasScrolled, setHasScrolled] = useState(false);
  /** Whether the user dismissed the bar — resets when they return to top */
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 40;
      setHasScrolled(scrolled);
      // Auto-restore when user scrolls back to top
      if (!scrolled) setDismissed(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  // Hidden when dismissed (only possible after scrolling)
  if (dismissed) return null;

  // ── embed=true (default) — slim horizontal player ──────────────────────
  return (
    <>
      <div className={`${styles.nowPlayingBar} ${hasScrolled ? styles.scrolled : ""}`}>
      {/* Left: album thumbnail */}
      <div className={styles.thumbnailWrapper}>{thumbnailEl}</div>

      {/* Middle: label + title + description */}
      <div className={styles.infoZone}>
        <span className={styles.label}>🎵 SOUNDTRACK</span>
        <a
          href={metadata?.playlistUrl ?? playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.playlistTitle}
        >
          {title}
        </a>
        {metadata?.description && (
          <span className={styles.description}>{metadata.description}</span>
        )}
      </div>

      {/* Right: video — poster+play until user clicks, then autoplay iframe */}
      <div className={styles.videoWrapper}>
        {mounted && playing ? (
          <iframe
            src={embedUrl}
            title={`${title} – YouTube playlist`}
            className={styles.videoIframe}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen={false}
          />
        ) : (
          <button
            className={styles.playButton}
            onClick={() => setPlaying(true)}
            aria-label={`Play ${title}`}
            type="button"
          >
            {thumbnailUrl && !imageError ? (
              <img src={thumbnailUrl} alt="" className={styles.posterImg} />
            ) : (
              <div className={styles.posterPlaceholder} />
            )}
            <span className={styles.playIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      {/* Dismiss button — only visible after user starts scrolling */}
      {hasScrolled && (
        <button
          className={styles.dismissButton}
          onClick={() => setDismissed(true)}
          aria-label="Close player"
          type="button"
        >
          ×
        </button>
      )}
    </div>
    {/* Spacer keeps content from sliding under the sticky bar when it locks */}
    <div className={styles.stickySpacerBottom} />
    </>
  );
};

export default MusicPlaylist;

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
  const [mounted, setMounted] = useState(false);
  /** Once true, the iframe is rendered with autoplay=1 (requires user gesture) */
  const [playing, setPlaying] = useState(false);

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

  // ── embed=true (default) — slim horizontal player ──────────────────────
  return (
    <div className={styles.nowPlayingBar}>
      {/* Left: album thumbnail */}
      <div className={styles.thumbnailWrapper}>{thumbnailEl}</div>

      {/* Middle: label + title + description */}
      <div className={styles.infoZone}>
        <span className={styles.label}>🎵 SOUNDTRACK</span>
        <a
          href={metadata?.playlistUrl ?? playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.playlistTitle}
        >
          {title}
        </a>
        {metadata?.description && (
          <span className={styles.description}>{metadata.description}</span>
        )}
      </div>

      {/* Right: video — poster+play until user clicks, then autoplay iframe */}
      <div className={styles.videoWrapper}>
        {mounted && playing ? (
          <iframe
            src={embedUrl}
            title={`${title} – YouTube playlist`}
            className={styles.videoIframe}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen={false}
          />
        ) : (
          <button
            className={styles.playButton}
            onClick={() => setPlaying(true)}
            aria-label={`Play ${title}`}
            type="button"
          >
            {thumbnailUrl && !imageError ? (
              <img src={thumbnailUrl} alt="" className={styles.posterImg} />
            ) : (
              <div className={styles.posterPlaceholder} />
            )}
            <span className={styles.playIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MusicPlaylist;
