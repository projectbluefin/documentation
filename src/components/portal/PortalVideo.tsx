import React from "react";
import styles from "./PortalVideo.module.css";
import { VIDEO_METADATA } from "./portalStaticData";

const srcDocMarkup = `<style>*{padding:0;margin:0;overflow:hidden}html,body{height:100%}img,span{position:absolute;width:100%;top:0;bottom:0;margin:auto}span{height:1.5em;text-align:center;font:48px/1.5 sans-serif;color:white;text-shadow:0 0 0.5em black}</style><a href="${VIDEO_METADATA.embedUrl}"><img src="${VIDEO_METADATA.posterUrl}" alt="${VIDEO_METADATA.posterAlt}"><span>▶</span></a>`;

export default function PortalVideo(): React.JSX.Element {
  return (
    <section id="scene-video" className={styles.videoSection}>
      <div className={styles.container}>
        <div className={styles.videoWrapper}>
          <iframe
            className={styles.videoIframe}
            width="560"
            height="315"
            src={VIDEO_METADATA.embedUrl}
            srcDoc={srcDocMarkup}
            title={VIDEO_METADATA.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.content}>
          <p>
            Project Bluefin is not a finished product, she is an ongoing passion
            project maintained by{" "}
            <a
              href="https://github.com/ublue-os/bluefin/graphs/contributors"
              target="_blank"
              rel="noopener noreferrer"
            >
              cloud-native enthusiasts
            </a>{" "}
            who seek a more reliable and maintainable Linux desktop experience.
            Check out the{" "}
            <a
              href="https://github.com/ublue-os/bluefin/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              open issues
            </a>
            .
          </p>
          <p>
            She represents the state of the art : a beautiful and unique
            creature. A perfect predator for a world that will inevitably face
            challenges. We must adapt. We can do it <strong>together</strong>.
          </p>
        </div>
      </div>
    </section>
  );
}
