import React from "react";
import GitHubProfileCard from "./GitHubProfileCard";
import styles from "./ReleaseContributors.module.css";

export type ContributorRole =
  | "maintainer"
  | "artist"
  | "gnome-os"
  | "bug-hunter"
  | "contributor";

export interface ReleaseContributor {
  login: string;
  role?: ContributorRole;
  /** Optional donation/sponsor URL shown as ♥ Sponsor button on the card */
  donationUrl?: string;
}

interface ReleaseContributorsProps {
  contributors: ReleaseContributor[];
  title?: string;
  /** Stats sentence shown below the title, e.g. country/percentage info. */
  stats?: string;
}

const RoleTitles: Record<ContributorRole, string | undefined> = {
  maintainer: "Maintainer",
  "gnome-os": "GNOME OS Team",
  artist: "Artist",
  "bug-hunter": "Bug Hunter",
  contributor: undefined,
};

type HighlightType = boolean | "gold" | "silver" | "diamond";
const RoleHighlight: Record<ContributorRole, HighlightType> = {
  maintainer: "gold",
  artist: "silver",
  "gnome-os": false,
  "bug-hunter": false,
  contributor: false,
};

const RoleLegendColor: Record<ContributorRole, string> = {
  maintainer: "#ffd700",
  "gnome-os": "#4a86cf",
  artist: "#b15e9c",
  "bug-hunter": "#e67e22",
  contributor: "var(--ifm-color-emphasis-300)",
};

const RoleOrder: ContributorRole[] = [
  "maintainer",
  "gnome-os",
  "artist",
  "bug-hunter",
  "contributor",
];

const ReleaseContributors: React.FC<ReleaseContributorsProps> = ({
  contributors,
  title = "Bluefin Brought to You By",
  stats,
}) => {
  const sorted = [...contributors].sort((a, b) =>
    a.login.toLowerCase().localeCompare(b.login.toLowerCase()),
  );

  const legendRoles = RoleOrder.filter((r) => r !== "contributor");

  return (
    <div className={styles.section}>
      <h2>{title}</h2>
      {stats && <p className={styles.stats}>{stats}</p>}
      <div className={styles.legend}>
        {legendRoles.map((role) => (
          <span key={role} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: RoleLegendColor[role] }}
            />
            {RoleTitles[role]}
          </span>
        ))}
      </div>
      <div className={styles.grid}>
        {sorted.map(({ login, role = "contributor", donationUrl }) => (
          <GitHubProfileCard
            key={login}
            username={login}
            title={RoleTitles[role]}
            highlight={RoleHighlight[role]}
            sponsorUrl={donationUrl}
          />
        ))}
      </div>
    </div>
  );
};

export default ReleaseContributors;

export type ContributorRole =
  | "maintainer"
  | "artist"
  | "gnome-os"
  | "contributor";

export interface ReleaseContributor {
  login: string;
  role?: ContributorRole;
  /** Optional donation/sponsor URL shown as ♥ Sponsor button on the card */
  donationUrl?: string;
}

interface ReleaseContributorsProps {
  contributors: ReleaseContributor[];
  title?: string;
  /** Stats sentence shown below the title, e.g. country/percentage info. */
  stats?: string;
}

const RoleTitles: Record<ContributorRole, string | undefined> = {
  maintainer: "Maintainer",
  "gnome-os": "GNOME OS Team",
  artist: "Artist",
  contributor: undefined,
};

type HighlightType = boolean | "gold" | "silver" | "diamond";
const RoleHighlight: Record<ContributorRole, HighlightType> = {
  maintainer: "gold",
  artist: "silver",
  "gnome-os": false,
  contributor: false,
};

const RoleColors: Record<ContributorRole, string> = {
  maintainer: "#ffd700",
  "gnome-os": "#4a86cf",
  artist: "#b15e9c",
  contributor: "var(--ifm-color-emphasis-300)",
};

const RoleLabels: Record<ContributorRole, string> = {
  maintainer: "Maintainer",
  "gnome-os": "GNOME OS Team",
  artist: "Artist",
  contributor: "Contributor",
};

const ReleaseContributors: React.FC<ReleaseContributorsProps> = ({
  contributors,
  title = "Bluefin Brought to You By",
  stats,
}) => {
  const sorted = [...contributors].sort((a, b) =>
    a.login.toLowerCase().localeCompare(b.login.toLowerCase()),
  );

  return (
    <div className={styles.section}>
      <h2>{title}</h2>
      {stats && <p className={styles.stats}>{stats}</p>}
      <div className={styles.legend}>
        {(Object.keys(RoleColors) as ContributorRole[])
          .filter((r) => r !== "contributor")
          .map((role) => (
            <span key={role} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: RoleColors[role] }}
              />
              {RoleLabels[role]}
            </span>
          ))}
      </div>
      <ul className={styles.grid}>
        {sorted.map(({ login, role = "contributor" }) => (
          <li key={login} className={styles.item}>
            <a
              href={`https://github.com/${login}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`@${login}${role !== "contributor" ? ` · ${RoleLabels[role]}` : ""}`}
              className={styles.link}
              style={
                {
                  "--ring-color": RoleColors[role],
                } as React.CSSProperties
              }
            >
              <img
                src={`https://github.com/${login}.png?size=64`}
                alt={login}
                width={40}
                height={40}
                className={styles.avatar}
              />
              <span className={styles.username}>@{login}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReleaseContributors;
