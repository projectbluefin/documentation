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
  | "contributor"
  | "emeritus";

export interface ReleaseContributor {
  login: string;
  /** Single role (backward-compat). Use `roles` for multiple titles. */
  role?: ContributorRole;
  /** Multiple roles — person will show a chip for each. Takes priority over `role`. */
  roles?: ContributorRole[];
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
  maintainer: "Bluefin Maintainer",
  "ublue-maintainer": "Universal Blue Maintainer",
  "aurora-maintainer": "Aurora Maintainer",
  "gnome-os": "GNOME OS Team",
  artist: "Artist",
  "bug-hunter": "Bug Hunter",
  "ublue-contributor": "Universal Blue Contributor",
  "aurora-contributor": "Aurora Contributor",
  contributor: "Bluefin Contributor",
  emeritus: "Maintainer Emeritus",
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
  emeritus: "silver",
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
  emeritus: "#8a9db5",
};

const RoleOrder: ContributorRole[] = [
  "maintainer",
  "ublue-maintainer",
  "aurora-maintainer",
  "gnome-os",
  "artist",
  "bug-hunter",
  "emeritus",
  "ublue-contributor",
  "aurora-contributor",
  "contributor",
];

type FoilLevel = "gold" | "silver" | "diamond" | "none";

const HighlightPriority: Record<FoilLevel, number> = {
  gold: 3,
  diamond: 2,
  silver: 1,
  none: 0,
};

function toFoilLevel(h: HighlightType): FoilLevel {
  if (!h) return "none";
  if (h === true) return "gold";
  return h;
}

/** Resolve the effective roles array (supports both `role` and `roles`). */
function effectiveRoles(c: ReleaseContributor): ContributorRole[] {
  if (c.roles && c.roles.length > 0) return c.roles;
  return [c.role ?? "contributor"];
}

/** Pick the highest-priority foil type across all roles. */
function bestHighlight(roles: ContributorRole[]): HighlightType {
  const best = roles.reduce<FoilLevel>((best, r) => {
    const level = toFoilLevel(RoleHighlight[r]);
    return HighlightPriority[level] > HighlightPriority[best] ? level : best;
  }, "none");
  return best === "none" ? false : best;
}

const ReleaseContributors: React.FC<ReleaseContributorsProps> = ({
  contributors,
  title = "Bluefin Brought to You By",
  stats,
}) => {
  const sorted = [...contributors].sort((a, b) =>
    a.login.toLowerCase().localeCompare(b.login.toLowerCase()),
  );

  // Collect all roles actually used in this release
  const usedRoles = new Set(contributors.flatMap((c) => effectiveRoles(c)));
  // Legend: show each role at most once, skip contributor and unused roles
  const legendRoles = RoleOrder.filter(
    (r) => r !== "contributor" && usedRoles.has(r),
  );

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
        {sorted.map((contributor) => {
          const roles = effectiveRoles(contributor);
          return (
            <GitHubProfileCard
              key={contributor.login}
              username={contributor.login}
              titles={roles.map((r) => ({
                label: RoleTitles[r],
                color: RoleLegendColor[r],
              }))}
              highlight={bestHighlight(roles)}
              sponsorUrl={contributor.donationUrl}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ReleaseContributors;
