import React, { useEffect, useState } from "react";
import styles from "./GitHubProfileCard.module.css";
import profilesData from "@site/static/data/github-profiles.json";

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  html_url: string;
  public_repos: number;
  followers: number;
}

interface GitHubProfileCardProps {
  username: string;
  title?: string;
  sponsorUrl?: string;
}

const GitHubProfileCard: React.FC<GitHubProfileCardProps> = ({
  username,
  title,
  sponsorUrl,
}) => {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use pre-fetched profile data from build time
    const profileData = profilesData[username];
    
    if (profileData) {
      setUser(profileData);
      setLoading(false);
    } else {
      console.error(`Profile data not found for ${username}`);
      setLoading(false);
    }
  }, [username]);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!user || user.login === undefined) {
    return (
      <div className={styles.card}>
        <div className={styles.error}>Unable to load profile</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <a href={user.html_url} target="_blank" rel="noopener noreferrer">
        <img
          src={user.avatar_url}
          alt={`${user.name || user.login}'s avatar`}
          className={styles.avatar}
        />
      </a>
      <div className={styles.content}>
        <h3 className={styles.name}>
          <a href={user.html_url} target="_blank" rel="noopener noreferrer">
            {user.name || user.login}
          </a>
        </h3>
        {title && <p className={styles.title}>{title}</p>}
        <p className={styles.bio}>{user.bio || "No bio available"}</p>
        <div className={styles.stats}>
          <span>
            <strong>{user.public_repos}</strong> repos
          </span>
          <span>
            <strong>{user.followers}</strong> followers
          </span>
        </div>
        {sponsorUrl && (
          <a
            href={sponsorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sponsorButton}
          >
            ❤️ Sponsor
          </a>
        )}
      </div>
    </div>
  );
};

export default GitHubProfileCard;
