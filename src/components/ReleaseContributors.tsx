import React from "react";
import GitHubProfileCard from "./GitHubProfileCard";
import styles from "./ReleaseContributors.module.css";

export type ContributorRole =
  | "maintainer"
  | "ublue-maintainer"
  | "aurora-maintainer"
  | "artist"
  | "gnome-os"
  | "bug-hunter"
  | "ublue-contributor"
  | "aurora-contributor"
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

const RoleTitles: Record<ContributorRole, string> = {
  maintainer: "Maintainer",
  "ublue-maintainer": "Universal Blue Maintainer",
  "aurora-maintainer": "Aurora Maintainer",
  "gnome-os": "GNOME OS Team",
  artist: "Artist",
  "bug-hunter": "Bug Hunter",
  "ublue-contributor": "Universal Blue Contributor",
  "aurora-contributor": "Aurora Contributor",
  contributor: "Contributor",
};

type HighlightType = boolean | "gold" | "silver" | "diamond";
const RoleHighlight: Record<ContributorRole, HighlightType> = {
  maintainer: "gold",
  "ublue-maintainer": "gold",
  "aurora-maintainer": "gold",
  artist: "diamond",
  "gnome-os": "silver",
  "bug-hunter": "gold",
  "ublue-contributor": false,
  "aurora-contributor": false,
  contributor: false,
};

const RoleLegendColor: Record<ContributorRole, string> = {
  maintainer: "#ffd700",
  "ublue-maintainer": "#1a7fd4",
  "aurora-maintainer": "#9333ea",
  "gnome-os": "#4a86cf",
  artist: "#b15e9c",
  "bug-hunter": "#e67e22",
  "ublue-contributor": "#1a7fd4",
  "aurora-contributor": "#9333ea",
  contributor: "var(--ifm-color-emphasis-300)",
};

const RoleOrder: ContributorRole[] = [
  "maintainer",
  "ublue-maintainer",
  "aurora-maintainer",
  "gnome-os",
  "artist",
  "bug-hunter",
  "ublue-contributor",
  "aurora-contributor",
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
            categoryColor={RoleLegendColor[role]}
            sponsorUrl={donationUrl}
          />
        ))}
      </div>
    </div>
  );
};

export default ReleaseContributors;
