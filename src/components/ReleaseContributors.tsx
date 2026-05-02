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
