import React from "react";
import styles from "./PortalPrototype.module.css";
import {
  MOBILE_LAYER_SRC,
  PORTAL_BREAKPOINT_PX,
  PORTAL_LAYERS,
  isParallaxVisible,
  layerTransform,
  overlayOpacity,
} from "./portalModel";

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function ResponsiveImage({
  src,
  media,
  priority = false,
}: {
  src: string;
  media: string;
  priority?: boolean;
}): React.JSX.Element {
  return (
    <picture>
      <source media={media} srcSet={src} />
      <img
        src={TRANSPARENT_PIXEL}
        alt=""
        fetchPriority={priority ? "high" : undefined}
      />
    </picture>
  );
}

export default function PortalParallax(): React.JSX.Element {
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = rootRef.current;
    const scenes = document.getElementById("portal-scenes");
    if (!root || !scenes) return;

    const rateLayers = Array.from(
      root.querySelectorAll<HTMLElement>("[data-rate]"),
      (layer) => ({
        element: layer,
        rate: Number(layer.dataset.rate ?? 0),
      }),
    );

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const render = (): void => {
      frame = 0;
      const scrollY = window.scrollY;
      const reduced = reducedMotion.matches;
      const sceneEnd = scenes.getBoundingClientRect().bottom + scrollY;
      root.hidden = !isParallaxVisible(scrollY, sceneEnd);
      root.style.setProperty(
        "--portal-night-opacity",
        reduced ? "0" : String(overlayOpacity(scrollY, window.innerHeight)),
      );
      for (const { element, rate } of rateLayers) {
        element.style.transform = reduced
          ? "none"
          : layerTransform(scrollY, rate);
      }
    };

    const schedule = (): void => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        schedule();
      });
      resizeObserver.observe(scenes);
    }

    render();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
      if (resizeObserver) resizeObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.parallaxViewport}
      aria-hidden="true"
      data-portal-parallax="true"
    >
      <div className={styles.parallaxCanvas}>
        <span className={styles.nightOverlay} />
        {PORTAL_LAYERS.map((layer) => (
          <div
            key={layer.key}
            className={[
              styles.parallaxLayer,
              styles.desktopLayer,
              layer.drift === "right" ? styles.cloudsRight : "",
              layer.drift === "left" ? styles.cloudsLeft : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ top: layer.top }}
            data-portal-mode="desktop"
            data-layer={layer.key}
            data-rate={layer.rate}
          >
            <ResponsiveImage
              src={layer.src}
              media={`(min-width: ${PORTAL_BREAKPOINT_PX + 1}px)`}
              priority={layer.priority}
            />
          </div>
        ))}
        <div
          className={[styles.parallaxLayer, styles.mobileLayer].join(" ")}
          data-portal-mode="mobile"
          data-rate="-0.05"
        >
          <ResponsiveImage
            src={MOBILE_LAYER_SRC}
            media={`(max-width: ${PORTAL_BREAKPOINT_PX}px)`}
            priority
          />
        </div>
      </div>
    </div>
  );
}
