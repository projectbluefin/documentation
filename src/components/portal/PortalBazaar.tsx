import React from "react";
import styles from "./PortalBazaar.module.css";
import { BAZAAR_METADATA } from "./portalStaticData";

export default function PortalBazaar(): React.JSX.Element {
  return (
    <section id="bazaar" className={styles.bazaarSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.tag}>
            <strong>{BAZAAR_METADATA.tag}</strong>
          </div>
          <h2 className={styles.title}>{BAZAAR_METADATA.title}</h2>
        </div>

        <div className={styles.main}>
          <div className={styles.description}>
            <p>
              Bluefin utilizes the{" "}
              <a
                href="https://usebazaar.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Bazaar
              </a>{" "}
              app store, allowing for easy installation and management of all
              your favorite applications from{" "}
              <a
                href="https://flathub.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Flathub
              </a>{" "}
              and a curated list of apps we think you&apos;ll love.
            </p>
            <div className={styles.screenshotWrap}>
              <img
                className={styles.screenshot}
                src={BAZAAR_METADATA.screenshotSrc}
                alt={BAZAAR_METADATA.screenshotAlt}
                width="1270"
                height="950"
                loading="lazy"
              />
              <img
                className={styles.bazaarIcon}
                src={BAZAAR_METADATA.iconSrc}
                alt={BAZAAR_METADATA.iconAlt}
                width="64"
                height="64"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className={styles.additional}>
          <p>
            Additionally, Bluefin provides{" "}
            <a
              href="https://docs.brew.sh/Homebrew-on-Linux"
              target="_blank"
              rel="noopener noreferrer"
            >
              Homebrew
            </a>{" "}
            and application container workflows, making running any piece of
            software a breeze. Since the entire software world comes in
            containers, using them becomes quick and efficient!
          </p>
          <p>
            <strong>Bluefin is developed on Bluefin.</strong>
          </p>
        </div>

        <div className={styles.buttonWrap}>
          <a
            className={styles.flathubButton}
            href={BAZAAR_METADATA.flathubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {BAZAAR_METADATA.flathubLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
