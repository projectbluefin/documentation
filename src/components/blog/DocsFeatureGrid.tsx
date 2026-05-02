import React from "react";
import styles from "./DocsFeatureGrid.module.css";

interface DocsFeature {
  icon: string;
  title: string;
  href: string;
  description: string;
  body?: string;
  thumbnail?: string;
}

interface DocsFeatureGridProps {
  features: DocsFeature[];
}

const DocsFeatureGrid: React.FC<DocsFeatureGridProps> = ({ features }) => (
  <div className={styles.list}>
    {features.map((f) => (
      <div key={f.href} className={styles.row}>
        <div className={styles.textSide}>
          <span className={styles.icon}>{f.icon}</span>
          <a
            href={f.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.title}
          >
            {f.title}
          </a>
          <p className={styles.description}>{f.description}</p>
          {f.body && <p className={styles.body}>{f.body}</p>}
        </div>
        {f.thumbnail && (
          <a
            href={f.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.thumbSide}
            tabIndex={-1}
            aria-hidden="true"
          >
            <img src={f.thumbnail} alt={f.title} loading="lazy" />
          </a>
        )}
      </div>
    ))}
  </div>
);

export default DocsFeatureGrid;
