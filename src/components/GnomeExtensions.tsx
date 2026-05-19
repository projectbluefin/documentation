import React, { useState, useEffect } from "react";
import styles from "./GnomeExtensions.module.css";

interface ExtensionData {
  id: number;
  uuid: string;
  name: string;
  creator: string;
  creatorUrl: string | null;
  description: string;
  url: string;
  screenshot: string | null;
  remoteScreenshot: string | null;
  icon: string | null;
  donateUrl: string | null;
}

interface GnomeExtensionsProps {
  extensionId: number;
}

const GnomeExtensions: React.FC<GnomeExtensionsProps> = ({ extensionId }) => {
  const [extension, setExtension] = useState<ExtensionData | null>(null);
  const [imageError, setImageError] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/data/gnome-extensions.json")
      .then((response) => response.json())
      .then((data: ExtensionData[]) => {
        const ext = data.find((item) => item.id === extensionId);
        if (ext) {
          setExtension(ext);
        }
      })
      .catch((error) => {
        console.error("Error loading extension metadata:", error);
        setLoadError(true);
      });
  }, [extensionId]);

  if (loadError) {
    return (
      <div className={styles.extensionBox}>
        <div className={styles.extensionInfo}>
          <p className={styles.extensionDescription}>Extension data unavailable.</p>
        </div>
      </div>
    );
  }

  if (!extension) {
    return <div className={styles.extensionBox}>Loading...</div>;
  }

  const thumbnailUrl = extension.screenshot || extension.remoteScreenshot;
  // Truncate to first line, then cap at 150 chars if still too long
  const firstLine = (extension.description ?? "").split("\n")[0];
  const shortDescription =
    firstLine.length > 150 ? firstLine.slice(0, 150) + "..." : firstLine;

  return (
    <div className={styles.extensionBox}>
      <a
        href={extension.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.extensionLink}
      >
        <div className={styles.thumbnailWrapper}>
          {thumbnailUrl && !imageError ? (
            <img
              src={thumbnailUrl}
              alt={extension.name}
              className={styles.thumbnail}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.thumbnailPlaceholder}>
              {extension.icon ? (
                <img
                  src={extension.icon}
                  alt={extension.name}
                  className={styles.placeholderIcon}
                />
              ) : (
                <svg
                  className={styles.puzzleIcon}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" />
                </svg>
              )}
            </div>
          )}
          <div className={styles.hoverOverlay}>
            <span className={styles.viewText}>View Extension</span>
          </div>
        </div>
      </a>
      <div className={styles.extensionInfo}>
        <h4 className={styles.extensionTitle}>
          <a
            href={extension.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.titleLink}
          >
            {extension.name}
          </a>
        </h4>
        <p className={styles.extensionAuthor}>
          by{" "}
          {extension.creatorUrl ? (
            <a
              href={extension.creatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.authorLink}
            >
              {extension.creator}
            </a>
          ) : (
            extension.creator
          )}
        </p>
        <p className={styles.extensionDescription}>{shortDescription}</p>
        {extension.donateUrl && (
          <a
            href={extension.donateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.donateLink}
          >
            ❤️ Support this extension
          </a>
        )}
      </div>
    </div>
  );
};

export default GnomeExtensions;
