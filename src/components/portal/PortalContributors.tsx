import React from "react";
import { FaGithub } from "react-icons/fa";
import { MdOutlineFavorite } from "react-icons/md";
import styles from "./PortalContributors.module.css";
import { CONTRIBUTORS_METADATA } from "./portalStaticData";
import staticContributorData from "@site/static/data/portal-contributors.json";

export interface Contributor {
  login: string;
  html_url: string;
}

export interface PortalContributorsData {
  generatedAt?: string;
  activityWindowSince?: string;
  activityWindowLabel?: string;
  contributors?: Contributor[];
  unavailable?: boolean;
  bluefinPulseUrl?: string;
}

export interface PortalContributorsProps {
  data?: PortalContributorsData;
}

export default function PortalContributors({
  data = staticContributorData as PortalContributorsData,
}: PortalContributorsProps = {}): React.JSX.Element {
  const {
    tag,
    title,
    description,
    bluefinRepoUrl,
    bluefinPulseUrl: defaultPulseUrl,
    donationsUrl,
    buttonLabel,
    donateButtonLabel,
  } = CONTRIBUTORS_METADATA;

  const contributors = data?.contributors ?? [];
  const unavailable = Boolean(data?.unavailable) || contributors.length === 0;
  const pulseUrl = data?.bluefinPulseUrl || defaultPulseUrl;
  const activityWindowLabel = data?.activityWindowLabel || "the past year";

  return (
    <section id="contributors" className={styles.contributorsSection}>
      <div className={styles.container}>
        <div className={styles.contributorsHeader}>
          <h2 className={styles.title}>{tag}</h2>
        </div>

        <div className={styles.contributorsCard}>
          <div className={styles.contributorsCopy}>
            <h3>{title}</h3>
            <p>{description}</p>
            <p className={styles.contributorsSummary}>
              Contributors active since {activityWindowLabel}.
            </p>
            <div className={styles.cardButtons}>
              <a
                className={styles.contributorsButton}
                href={bluefinRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.buttonIcon}>
                  <FaGithub aria-hidden="true" />
                </span>
                <span>{buttonLabel}</span>
              </a>
              <a
                className={styles.contributorsButtonSecondary}
                href={donationsUrl}
              >
                <span className={styles.buttonIcon}>
                  <MdOutlineFavorite aria-hidden="true" />
                </span>
                <span>{donateButtonLabel}</span>
              </a>
            </div>
          </div>

          <div className={styles.contributorsList} aria-live="polite">
            {unavailable ? (
              <div className={styles.contributorsState}>
                <span>GitHub activity is unavailable right now.</span>
                <a href={pulseUrl} target="_blank" rel="noopener noreferrer">
                  View activity on GitHub
                </a>
              </div>
            ) : (
              <div className={styles.activityList}>
                {contributors.map((contributor) => (
                  <a
                    key={contributor.login}
                    className={styles.activityRow}
                    href={contributor.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaGithub
                      className={styles.githubMark}
                      aria-hidden="true"
                    />
                    <span className={styles.contributorName}>
                      {contributor.login}
                    </span>
                  </a>
                ))}
                <a
                  className={styles.activityFooter}
                  href={pulseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View full repository activity on GitHub →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
