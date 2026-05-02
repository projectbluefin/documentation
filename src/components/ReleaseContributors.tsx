import React from "react";
import styles from "./ReleaseContributors.module.css";

export type ContributorRole =
  | "maintainer"
  | "artist"
  | "gnome-os"
  | "contributor";

export interface ReleaseContributor {
  login: string;
  role?: ContributorRole;
}

interface ReleaseContributorsProps {
  contributors: ReleaseContributor[];
  title?: string;
}

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
}) => {
  const sorted = [...contributors].sort((a, b) =>
    a.login.toLowerCase().localeCompare(b.login.toLowerCase()),
  );

  return (
    <div className={styles.section}>
      <h2>{title}</h2>
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
