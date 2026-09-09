import React, { useEffect, useState } from "react";
import styles from "./PortalPageLoading.module.css";

export default function PortalPageLoading(): React.JSX.Element {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev === "....." ? "." : prev + "."));
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={styles.pageLoading}
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <span className={styles.loader} aria-hidden="true" />
      <span className={styles.dots} aria-hidden="true">
        {dots}
      </span>
    </div>
  );
}
