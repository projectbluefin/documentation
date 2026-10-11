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
      </div>
      <p className={styles.sources}>
        <a href={readme}>Upstream README</a>
        {" · "}
        <a href="https://github.com/projectbluefin/artwork">Artwork source</a>
        {" · "}
        <a href="https://github.com/projectbluefin/artwork/blob/main/LICENSE">
          Artwork license
        </a>
      </p>
    </header>
  );
}
