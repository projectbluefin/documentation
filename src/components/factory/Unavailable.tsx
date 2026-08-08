import React from "react";
import styles from "./FactoryShell.module.css";

/**
 * The one visible-unavailability component.
 *
 * ADR 0002: "a dashboard that silently renders less is indistinguishable from a
 * healthy one with less to report." Every panel that can lack data renders this
 * instead of returning null.
 */
export default function Unavailable({
  what,
  reason,
}: {
  what: string;
  reason: string;
}): React.JSX.Element {
  return (
    <div className={styles.unavailable} role="status">
      <span className={styles.unavailableGlyph} aria-hidden="true">
        ○
      </span>
      <div>
        <strong>{what} unavailable</strong>
        <p className={styles.unavailableReason}>{reason}</p>
      </div>
    </div>
  );
}
