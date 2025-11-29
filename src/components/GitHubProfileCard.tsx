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

const CACHE_KEY_PREFIX = "github_profile_";
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

const GitHubProfileCard: React.FC<GitHubProfileCardProps> = ({
  username,
  title,
  sponsorUrl,
}) => {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First, try pre-fetched build-time data
    const profileData = profilesData[username];
    
    if (profileData) {
      setUser(profileData);
      setLoading(false);
      return;
    }

    // Second, check localStorage cache for runtime-fetched profiles
    if (typeof window !== "undefined") {
      const cacheKey = `${CACHE_KEY_PREFIX}${username}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_DURATION) {
            setUser(data);
            setLoading(false);
            return;
          } else {
            // Cache expired, remove it
            localStorage.removeItem(cacheKey);
          }
        } catch (e) {
          // Invalid cache data
          localStorage.removeItem(cacheKey);
        }
      }
    }

    // Finally, fetch from GitHub API as fallback
    fetch(`https://api.github.com/users/${username}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`GitHub API returned ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const profileData = {
          login: data.login,
          name: data.name,
          avatar_url: data.avatar_url,
          bio: data.bio,
          html_url: data.html_url,
          public_repos: data.public_repos,
          followers: data.followers,
        };
        
        setUser(profileData);
        setLoading(false);
        
        // Cache in localStorage with 30-day expiry
        if (typeof window !== "undefined") {
          try {
            const cacheKey = `${CACHE_KEY_PREFIX}${username}`;
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data: profileData,
                timestamp: Date.now(),
              })
            );
          } catch (e) {
            console.warn(`Failed to cache profile for ${username}`);
          }
        }
      })
      .catch((error) => {
        console.error(`Failed to load profile for ${username}:`, error);
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
