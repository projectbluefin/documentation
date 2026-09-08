import React from "react";
import {
  MdOutlineDescription,
  MdOutlineMessage,
  MdOutlineForum,
} from "react-icons/md";
import styles from "./PortalCommunity.module.css";
import { COMMUNITY_METADATA } from "./portalStaticData";

export default function PortalCommunity(): React.JSX.Element {
  const { tag, title, docsCard } = COMMUNITY_METADATA;

  return (
    <section id="scene-community" className={styles.communitySection}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.tag}>
              <strong>{tag}</strong>
            </div>
            <h2 className={styles.title}>{title}</h2>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <a
                href={docsCard.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="View Documentation"
              >
                <img
                  src={docsCard.iconSrc}
                  alt={docsCard.iconAlt}
                  width="200"
                  height="200"
                  loading="lazy"
                />
              </a>
            </div>

            <div className={styles.cardBody}>
              <h3>{docsCard.title}</h3>
              <p>{docsCard.description}</p>

              <div className={styles.cardButtons}>
                <a
                  className={styles.communityButton}
                  href={docsCard.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.buttonIcon}>
                    <MdOutlineDescription aria-hidden="true" />
                  </span>
                  <span>View Documentation</span>
                </a>

                <a
                  className={styles.communityButton}
                  href={docsCard.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.buttonIcon}>
                    <MdOutlineMessage aria-hidden="true" />
                  </span>
                  <span>Join our Discord</span>
                </a>

                <a
                  className={styles.communityButton}
                  href={docsCard.discussionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.buttonIcon}>
                    <MdOutlineForum aria-hidden="true" />
                  </span>
                  <span>Discussions</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
