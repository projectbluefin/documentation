import React from "react";
import styles from "./BlueskyPost.module.css";

interface BlueskyPostProps {
  /** Full URL of the post on bsky.app. */
  url: string;
  /** Display name shown above the handle. */
  displayName: string;
  /** Handle without the leading @, e.g. "castrojo.bsky.social". */
  handle: string;
  /** Avatar image path, relative to /static or a full URL. */
  avatar: string;
  /** Post body. Line breaks are preserved. */
  text: string;
  /** ISO 8601 timestamp of the post. */
  timestamp: string;
  /** Optional attached image. */
  image?: { src: string; alt: string };
}

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const BlueskyPost: React.FC<BlueskyPostProps> = ({
  url,
  displayName,
  handle,
  avatar,
  text,
  timestamp,
  image,
}) => (
  <blockquote className={styles.card} cite={url}>
    <div className={styles.header}>
      <img className={styles.avatar} src={avatar} alt="" loading="lazy" />
      <div className={styles.identity}>
        <span className={styles.name}>{displayName}</span>
        <span className={styles.handle}>@{handle}</span>
      </div>
      <svg
        className={styles.butterfly}
        width="20"
        height="18"
        viewBox="0 0 568 501"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M123.121 33.6637C188.241 82.5526 258.281 181.681 284 234.873c25.719-53.192 95.759-152.32 160.879-201.2093C491.866-1.61183 568-28.9064 568 57.9464c0 17.3443-9.945 145.688-15.778 166.523-20.275 72.427-94.155 90.851-159.875 79.672 114.875 19.548 144.097 84.322 81 149.096-119.851 123.011-172.272-30.859-185.702-70.281-2.462-7.227-3.614-10.608-3.631-7.733-.017-2.875-1.169.506-3.631 7.733-13.43 39.422-65.851 193.292-185.702 70.281-63.0969-64.774-33.8748-129.548 81.0002-149.096C110.955 315.121 37.0754 296.697 16.8003 224.27 10.9673 203.435 1.02198 75.0904 1.02198 57.9464 1.02198-28.9064 77.2543-1.61183 123.121 33.6637Z" />
      </svg>
    </div>

    <p className={styles.text}>{text}</p>

    {image && (
      <div className={styles.media}>
        <img src={image.src} alt={image.alt} loading="lazy" decoding="async" />
      </div>
    )}

    <div className={styles.footer}>
      <time dateTime={timestamp}>{formatTimestamp(timestamp)}</time>
      <a
        className={styles.permalink}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Bluesky
      </a>
    </div>
  </blockquote>
);

export default BlueskyPost;
