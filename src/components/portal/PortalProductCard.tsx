import React from "react";
import styles from "./PortalSectionPicker.module.css";
import type { ProductVersionRow } from "./portalStreamAdapter";

export interface PortalProductCardProps {
  title: string;
  description?: string;
  image: string;
  href?: string;
  badgeTitle?: string;
  badgeSub?: string;
  versionRows?: ProductVersionRow[];
  isCenter?: boolean;
}

export default function PortalProductCard({
  title,
  description,
  image,
  href,
  badgeTitle,
  badgeSub,
  versionRows,
  isCenter,
}: PortalProductCardProps): React.JSX.Element {
  const cardClassName = [
    styles.cardBox,
    isCenter ? styles.cardCenter : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {badgeTitle && (
        <div className={styles.alphaBadge}>
          <span className={styles.alphaBadgeTitle}>{badgeTitle}</span>
          {badgeSub && <span className={styles.alphaBadgeSub}>{badgeSub}</span>}
        </div>
      )}
      <div
        className={styles.cardImage}
        style={{ backgroundImage: `url(${image})` }}
      >
        <div className={styles.cardOverlay}>
          <span className={styles.cardTitle}>{title}</span>
          {description && (
            <span className={styles.cardDescription}>{description}</span>
          )}
          {versionRows && versionRows.length > 0 && (
            <div className={styles.versionInfo}>
              {versionRows.map((row) => (
                <div key={row.label} className={styles.versionRow}>
                  <span className={styles.versionLabel}>{row.label}</span>
                  <span className={styles.versionValue}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <a className={cardClassName} href={href}>
        {content}
      </a>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
