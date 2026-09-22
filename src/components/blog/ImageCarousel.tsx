import React, { useState, useEffect, useCallback, useRef } from "react";
import Heading from "@theme/Heading";
import styles from "./ImageCarousel.module.css";

export interface CarouselImage {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  caption?: string;
}

export interface ImageCarouselProps {
  title?: string;
  subtitle?: string;
  images: CarouselImage[];
  aspectRatio?: string;
}

export default function ImageCarousel({
  title,
  subtitle,
  images,
  aspectRatio = "16 / 10",
}: ImageCarouselProps): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const total = images.length;

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex((index + total) % total);
    },
    [total],
  );

  const prev = useCallback(() => {
    setCurrentIndex((c) => (c - 1 + total) % total);
  }, [total]);

  const next = useCallback(() => {
    setCurrentIndex((c) => (c + 1) % total);
  }, [total]);

  const openLightbox = () => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
      closeBtnRef.current?.focus();
    }
  };

  const closeLightbox = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    }
  };

  // Keyboard navigation & dialog cleanup
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (dialog.open) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          prev();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          next();
        }
      }
    };

    const handleCancel = () => {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    };

    dialog.addEventListener("keydown", handleKeyDown);
    dialog.addEventListener("cancel", handleCancel);

    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      dialog.removeEventListener("cancel", handleCancel);
      document.body.style.overflow = "";
    };
  }, [prev, next]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    setTouchStart(null);
  };

  if (!images || images.length === 0) return <></>;

  const current = images[currentIndex];

  return (
    <section
      className={styles.container}
      aria-label={title || "Image Carousel"}
    >
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && (
            <Heading as="h3" className={styles.headerTitle}>
              {title}
            </Heading>
          )}
          {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
        </div>
      )}

      {/* Main viewport */}
      <div
        className={styles.viewport}
        style={{ aspectRatio }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          ref={triggerRef}
          type="button"
          className={styles.slideButton}
          onClick={openLightbox}
          aria-label={`Enlarge image: ${current.title || current.alt}`}
        >
          <img
            src={current.src}
            alt={current.alt}
            className={styles.mainImage}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.expandHint}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            <span>Click to expand</span>
          </div>
        </button>

        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              className={`${styles.navButton} ${styles.prevButton}`}
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}

        {/* Badge counter */}
        <div className={styles.badge}>
          {currentIndex + 1} / {total}
        </div>
      </div>

      {/* Info bar below image */}
      <div className={styles.infoBar}>
        <div className={styles.infoText}>
          {current.title && (
            <Heading as="h4" className={styles.imageTitle}>
              {current.title}
            </Heading>
          )}
          {current.subtitle && (
            <p className={styles.imageSubtitle}>{current.subtitle}</p>
          )}
          {current.caption && (
            <p className={styles.imageCaption}>{current.caption}</p>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div
          className={styles.thumbnailStrip}
          role="group"
          aria-label="Image thumbnails"
        >
          {images.map((img, idx) => (
            <button
              key={img.src}
              type="button"
              aria-current={idx === currentIndex ? "true" : undefined}
              aria-label={`Slide ${idx + 1}: ${img.title || img.alt}`}
              className={`${styles.thumbnailBtn} ${idx === currentIndex ? styles.activeThumbnail : ""}`}
              onClick={() => goTo(idx)}
            >
              <img
                src={img.src}
                alt=""
                className={styles.thumbnailImg}
                loading="lazy"
              />
              {img.title && (
                <span className={styles.thumbnailLabel}>{img.title}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Native Lightbox Modal via <dialog> */}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            closeLightbox();
          }
        }}
        aria-label={current.title || current.alt}
      >
        <div className={styles.lightboxInner}>
          <div className={styles.lightboxHeader}>
            <div className={styles.lightboxHeaderInfo}>
              {current.title && (
                <span className={styles.lightboxHeaderTitle}>
                  {current.title}
                </span>
              )}
              {current.subtitle && (
                <span className={styles.lightboxHeaderSubtitle}>
                  {" "}
                  — {current.subtitle}
                </span>
              )}
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              className={styles.closeBtn}
              onClick={closeLightbox}
              aria-label="Close fullscreen"
            >
              ✕
            </button>
          </div>

          <div className={styles.lightboxImageArea}>
            {total > 1 && (
              <button
                type="button"
                className={`${styles.navButton} ${styles.prevButton} ${styles.lightboxNav}`}
                onClick={prev}
                aria-label="Previous image"
              >
                ‹
              </button>
            )}
            <img
              src={current.src}
              alt={current.alt}
              className={styles.lightboxImg}
            />
            {total > 1 && (
              <button
                type="button"
                className={`${styles.navButton} ${styles.nextButton} ${styles.lightboxNav}`}
                onClick={next}
                aria-label="Next image"
              >
                ›
              </button>
            )}
          </div>

          <div className={styles.lightboxFooter}>
            <span>
              {currentIndex + 1} of {total}
            </span>
            <a
              href={current.src}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.fullResLink}
            >
              Open full resolution ↗
            </a>
          </div>
        </div>
      </dialog>
    </section>
  );
}
