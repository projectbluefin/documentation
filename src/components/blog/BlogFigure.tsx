import React from "react";
import styles from "./BlogFigure.module.css";

interface BlogFigureProps {
  /** Path to image/GIF/WebP — relative to /static or a full URL */
  src: string;
  alt: string;
  caption?: string;
  /** Optional: constrain max width (e.g. "640px"). Defaults to full column. */
  maxWidth?: string;
}

const BlogFigure: React.FC<BlogFigureProps> = ({
  src,
  alt,
  caption,
  maxWidth,
}) => {
  return (
    <figure className={styles.figure} style={maxWidth ? { maxWidth } : undefined}>
      <img
        src={src}
        alt={alt}
        className={styles.image}
        loading="lazy"
        decoding="async"
      />
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
};

export default BlogFigure;
