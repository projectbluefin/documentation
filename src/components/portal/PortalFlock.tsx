import React from "react";
import styles from "./PortalFlock.module.css";
import { FLOCK_METADATA } from "./portalStaticData";

export interface PortalFlockProps {
  children?: React.ReactNode;
}

export default function PortalFlock({
  children,
}: PortalFlockProps = {}): React.JSX.Element {
  const {
    title,
    description,
    chartSrc,
    chartAlt,
    attributionPrefix,
    countMeUrl,
    countMeLabel,
  } = FLOCK_METADATA;

  return (
    <section id="flock" className={styles.flockSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>

        <div className={styles.card}>
          <img
            className={styles.growthChart}
            src={chartSrc}
            alt={chartAlt}
            loading="lazy"
          />
        </div>

        <p className={styles.attribution}>
          {attributionPrefix}{" "}
          <a href={countMeUrl} target="_blank" rel="noopener noreferrer">
            {countMeLabel}
          </a>
        </p>

        {children}
      </div>
    </section>
  );
}
