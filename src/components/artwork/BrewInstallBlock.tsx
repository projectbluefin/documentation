import React from "react";
import styles from "../ArtworkGallery.module.css";

interface BrewInstallBlockProps {
  brewCask: string;
}

export default function BrewInstallBlock({ brewCask }: BrewInstallBlockProps): React.JSX.Element {
  return (
    <div className={styles.brewInstall}>
      <code className={styles.brewCmd}>brew install --cask {brewCask}</code>
    </div>
  );
}
