import React from 'react';
import styles from './ActivityCard.module.css';

interface Assignee {
  login: string;
  name: string | null;
  avatarUrl: string;
}

interface Label {
  name: string;
  color: string;
}

interface ActivityCardProps {
  title: string;
  body?: string;
  status: string;
  isDraft: boolean;
  isPR: boolean;
  updatedAt: string;
  url?: string | null;
  repository?: string | null;
  repositoryUrl?: string | null;
  number?: number | null;
  assignees?: Assignee[];
  labels?: Label[];
}

/**
 * Format date as relative time (e.g., "2 days ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Normalize status name for CSS class
 */
function normalizeStatus(status: string): string {
  return status.replace(/\s+/g, '');
}

/**
 * Get hex color with # prefix
 */
function getHexColor(color: string): string {
  return color.startsWith('#') ? color : `#${color}`;
}

/**
 * Get contrasting text color for a background color
 */
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * ActivityCard component - displays a project board item
 */
export default function ActivityCard({
  title,
  body,
  status,
  isDraft,
  isPR,
  updatedAt,
  url,
  repository,
  repositoryUrl,
  number,
  assignees = [],
  labels = [],
}: ActivityCardProps): JSX.Element {
  const statusClass = normalizeStatus(status);
  const description = body?.split('\n')[0]?.trim() || '';

  return (
    <div className={`${styles.card} ${styles[`status${statusClass}`] || styles.statusNoStatus}`}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>
            {url ? (
              <a href={url} className={styles.titleLink} target="_blank" rel="noopener noreferrer">
                {title}
              </a>
            ) : (
              title
            )}
          </h3>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles.statusBadge}`}>{status}</span>
            {isDraft && <span className={`${styles.badge} ${styles.draftBadge}`}>Draft</span>}
            {isPR && <span className={`${styles.badge} ${styles.prBadge}`}>Pull Request</span>}
          </div>
        </div>
      </div>

      {description && <p className={styles.description}>{description}</p>}

      {labels.length > 0 && (
        <div className={styles.labels}>
          {labels.map((label) => {
            const bgColor = getHexColor(label.color);
            const textColor = getContrastColor(bgColor);
            return (
              <span
                key={label.name}
                className={styles.label}
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  borderColor: textColor,
                  opacity: 0.9,
                }}
              >
                {label.name}
              </span>
            );
          })}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.metadata}>
          <span className={styles.metadataItem}>
            <span>🕒</span>
            <span>{formatRelativeTime(updatedAt)}</span>
          </span>
          {repository && (
            <span className={styles.metadataItem}>
              <span>📦</span>
              {repositoryUrl ? (
                <a
                  href={repositoryUrl}
                  className={styles.repoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {repository}
                </a>
              ) : (
                <span>{repository}</span>
              )}
              {number && <span>#{number}</span>}
            </span>
          )}
        </div>

        {assignees.length > 0 && (
          <div className={styles.assignees}>
            <span className={styles.assigneeIcon}>
              👤
            </span>
            <div className={styles.avatarGroup}>
              {assignees.map((assignee) => (
                <a
                  key={assignee.login}
                  href={`https://github.com/${assignee.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={assignee.name || assignee.login}
                >
                  <img
                    src={assignee.avatarUrl}
                    alt={assignee.login}
                    className={styles.avatar}
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
