import React from "react";
import styles from "./DocsFeatureGrid.module.css";

interface DocsFeature {
  icon: string;
  title: string;
  href: string;
  description: string;
}

interface DocsFeatureGridProps {
  features: DocsFeature[];
}

const DocsFeatureGrid: React.FC<DocsFeatureGridProps> = ({ features }) => (
  <div className={styles.grid}>
    {features.map((f) => (
      <a
        key={f.href}
        href={f.href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.card}
      >
        <span className={styles.icon}>{f.icon}</span>
        <div className={styles.body}>
          <span className={styles.title}>{f.title}</span>
          <span className={styles.description}>{f.description}</span>
        </div>
      </a>
    ))}
  </div>
);

export default DocsFeatureGrid;
