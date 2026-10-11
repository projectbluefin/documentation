import React from "react";
import identities from "./image-identities.json";
import styles from "./ImageIdentity.module.css";

export type ImageProduct = keyof typeof identities;

export default function ImageIdentity({ product }: { product: ImageProduct }) {
  const identity = identities[product];
  const readme = `https://github.com/${identity.repo}/blob/${identity.ref}/README.md`;

  return (
    <header className={styles.identity}>
      {identity.logoLight && (
        <a
          href="https://github.com/projectbluefin/artwork"
          className={styles.wordmark}
        >
          <img
            className={styles.logoLight}
            src={identity.logoLight}
            alt=""
            width="400"
          />
          <img
            className={styles.logoDark}
            src={identity.logoDark}
            alt=""
            width="400"
          />
        </a>
      )}
      <p className={styles.species}>
        <a href={identity.wikipedia}>
          <i>{identity.species}</i>
        </a>
      </p>
      <div className={styles.artwork}>
        {identity.images.map((image) => (
          <figure
            key={image.src}
            className={image.diagram ? styles.diagram : styles.character}
          >
            <a href={image.source}>
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                decoding="async"
              />
            </a>
            <figcaption>
              <a href={image.source}>{image.attribution}</a>
            </figcaption>
          </figure>
        ))}
        {identity.testsuiteScreenshot ? (
          <figure className={styles.screenshotFigure}>
            <a href={identity.testsuiteScreenshot}>
              <img
                src={identity.testsuiteScreenshot}
                alt={`${identity.name} testsuite verification capture`}
                loading="lazy"
                decoding="async"
              />
            </a>
            <figcaption>
              <a href={identity.testsuiteRun ?? "https://projectbluefin.github.io/testsuite/"}>
                QA Verified · Testsuite boot capture
              </a>
            </figcaption>
          </figure>
        ) : identity.testsuiteRun ? (
          <figure className={styles.headlessFigure}>
            <div className={styles.headlessCard}>
              <span className={styles.headlessBadge}>Headless Server OS</span>
              <p>Continuous validation via containerized boot &amp; system tests</p>
              <a
                href={identity.testsuiteRun}
                className={styles.headlessLink}
              >
                View automated build tests ↗
              </a>
            </div>
          </figure>
        ) : null}
      </div>
      <p className={styles.sources}>
        <a href={readme}>Upstream README</a>
        {" · "}
        <a href="https://github.com/projectbluefin/artwork">Artwork source</a>
        {" · "}
        <a href="https://github.com/projectbluefin/artwork/blob/main/LICENSE">
          Artwork license
        </a>
        {identity.testsuiteRun && (
          <>
            {" · "}
            <a href={identity.testsuiteRun}>QA verification run</a>
          </>
        )}
      </p>
    </header>
  );
}
