import React, { useEffect, useState } from "react";
import styles from "./GitHubProfileCard.module.css";

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

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEY_PREFIX = "github_profile_";

const GitHubProfileCard: React.FC<GitHubProfileCardProps> = ({
  username,
  title,
  sponsorUrl,
}) => {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `${CACHE_KEY_PREFIX}${username}`;
    
    // Check if we have cached data
    if (typeof window !== "undefined") {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const age = Date.now() - timestamp;
          
          // Use cached data if it's less than 24 hours old
          if (age < CACHE_DURATION) {
            setUser(data);
            setLoading(false);
            return;
          }
        } catch (e) {
          // Invalid cache data, will fetch fresh
          localStorage.removeItem(cacheKey);
        }
      }
    }

    // Fetch fresh data
    fetch(`https://api.github.com/users/${username}`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
        
        // Cache the data
        if (typeof window !== "undefined" && data.login) {
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data,
                timestamp: Date.now(),
              })
            );
          } catch (e) {
            // localStorage might be full, ignore
            console.warn(`Failed to cache profile for ${username}`);
          }
        }
      })
      .catch((error) => {
        console.error(`Error fetching GitHub user ${username}:`, error);
        setLoading(false);
      });
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
