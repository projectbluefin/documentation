import React from "react";
import styles from "./ContributorCardGrid.module.css";

type ContributorRole = "maintainer" | "artist" | "gnome-os" | "contributor";

interface Contributor {
  login: string;
  role?: ContributorRole;
  donationUrl?: string;
}

interface ContributorCardGridProps {
  contributors: Contributor[];
  title?: string;
}

const roleClass: Record<ContributorRole, string> = {
  maintainer: "roleMaintainer",
  artist: "roleArtist",
  "gnome-os": "roleGnomeOs",
  contributor: "roleContributor",
};

const ContributorCard: React.FC<{ contributor: Contributor }> = ({
  contributor,
}) => {
  const { login, role = "contributor", donationUrl } = contributor;
  const avatarUrl = `https://github.com/${login}.png?size=48`;
  const profileUrl = `https://github.com/${login}`;
  const cardClass = `${styles.card} ${styles[roleClass[role]]}`;

  return (
    <div className={cardClass} title={`@${login} — ${role}`}>
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.profileLink}
      >
        <img
          src={avatarUrl}
          alt={`${login} avatar`}
          className={styles.avatar}
          loading="lazy"
          width={40}
          height={40}
        />
        <span className={styles.login}>@{login}</span>
      </a>
      {donationUrl ? (
        <a
          href={donationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.donationLink}
          title={`Support @${login}`}
          onClick={(e) => e.stopPropagation()}
        >
          ♥ Support
        </a>
      ) : (
        <span className={styles.donationPlaceholder} />
      )}
    </div>
  );
};

const ContributorCardGrid: React.FC<ContributorCardGridProps> = ({
  contributors,
  title,
}) => {
  return (
    <div className={styles.wrapper}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.grid}>
        {contributors.map((c) => (
          <ContributorCard key={c.login} contributor={c} />
        ))}
      </div>
      <p className={styles.legend}>
        <span className={`${styles.dot} ${styles.roleMaintainer}`} /> Maintainer
        &nbsp;
        <span className={`${styles.dot} ${styles.roleArtist}`} /> Artist &nbsp;
        <span className={`${styles.dot} ${styles.roleGnomeOs}`} /> GNOME OS
        &nbsp;
        <span className={`${styles.dot} ${styles.roleContributor}`} />{" "}
        Contributor
      </p>
    </div>
  );
};

export default ContributorCardGrid;
