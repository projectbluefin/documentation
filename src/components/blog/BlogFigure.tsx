import React from "react";
import styles from "./BlogFigure.module.css";

interface BlogFigureProps {
  /** Path to image/GIF/WebP/MP4/WebM — relative to /static or a full URL.
   *  .mp4 and .webm are rendered as a looping muted autoplay video (much
   *  smaller than GIF). Everything else renders as <img>. */
  src: string;
  alt: string;
  caption?: string;
  /** Optional: constrain max width (e.g. "640px"). Defaults to full column. */
  maxWidth?: string;
}

const isVideo = (src: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(src);

const BlogFigure: React.FC<BlogFigureProps> = ({
  src,
  alt,
  caption,
  maxWidth,
}) => {
  return (
    <figure className={styles.figure} style={maxWidth ? { maxWidth } : undefined}>
      {isVideo(src) ? (
        <video
          src={src}
          className={styles.image}
          autoPlay
          loop
          muted
          playsInline
          aria-label={alt}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className={styles.image}
          loading="lazy"
          decoding="async"
        />
      )}
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
};

export default BlogFigure;
