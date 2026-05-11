import React from "react";
import Link from "@docusaurus/Link";
import { blogSeries } from "@site/src/config/series";
import styles from "./BlogSeries.module.css";

interface BlogSeriesProps {
  seriesId: string;
  currentPart: number;
}

const BlogSeries: React.FC<BlogSeriesProps> = ({ seriesId, currentPart }) => {
  const series = blogSeries[seriesId];
  if (!series) return null;

  const total = series.parts.length;

  return (
    <div className={styles.container}>
      <p className={styles.header}>
        Part {currentPart} of {total}
      </p>
      <ol className={styles.list}>
        {series.parts.map((p) => {
          const isCurrent = p.part === currentPart;
          const isAvailable = p.published && !isCurrent;

          return (
            <li key={p.part} className={`${styles.item} ${isCurrent ? styles.current : ""} ${!p.published && !isCurrent ? styles.upcoming : ""}`}>
              {isAvailable ? (
                <Link to={`/blog/${p.slug}`} className={styles.link}>
                  {p.title}
                </Link>
              ) : (
                <span className={styles.title}>{p.title}</span>
              )}
              {isCurrent && <span className={styles.badge}>you are here</span>}
              {!p.published && !isCurrent && (
                <span className={styles.date}>Coming {p.date}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default BlogSeries;
