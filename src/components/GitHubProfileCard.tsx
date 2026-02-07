/**
 * SSR-Safe: Uses typeof window checks before accessing localStorage.
 * Data fetching strategy: build-time JSON → localStorage cache → runtime API fallback
 */
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
  highlight?: boolean | "gold" | "silver" | "diamond";
}

const CACHE_KEY_PREFIX = "github_profile_";
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Global request queue to prevent rate limiting
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly MIN_DELAY = 1000; // 1 second between requests

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      // Wait if we're going too fast
      if (timeSinceLastRequest < this.MIN_DELAY) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.MIN_DELAY - timeSinceLastRequest),
        );
      }

      const request = this.queue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request();
      }
    }

    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

// Try to detect if we're in a build/SSR context where we might have a token
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Bluefin-Docs",
  };

  // In browser context, check for any available auth
  if (typeof window !== "undefined") {
    // Check if there's a token in window (could be injected by build process)
    const token = (window as any).GITHUB_TOKEN;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
};

const fetchGitHubProfile = async (username: string): Promise<GitHubUser> => {
  return requestQueue.add(async () => {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      // Check if we hit rate limit
      const remaining = response.headers.get("X-RateLimit-Remaining");
      const resetTime = response.headers.get("X-RateLimit-Reset");

      if (response.status === 403 && remaining === "0") {
        const resetDate = resetTime
          ? new Date(parseInt(resetTime) * 1000)
          : new Date();
        throw new Error(
          `GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`,
        );
      }

      throw new Error(`GitHub API returned ${response.status}`);
    }

    const data = await response.json();

    return {
      login: data.login,
      name: data.name,
      avatar_url: data.avatar_url,
      bio: data.bio,
      html_url: data.html_url,
      public_repos: data.public_repos,
      followers: data.followers,
    };
  });
};

const GitHubProfileCard: React.FC<GitHubProfileCardProps> = ({
  username,
  title,
  sponsorUrl,
  highlight = false,
}) => {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointerStyles, setPointerStyles] = useState<React.CSSProperties>({});

  // Normalize highlight prop: true -> 'gold', false/undefined -> null
  const highlightType = highlight === true ? "gold" : highlight || null;

  // Mouse tracking for holographic effect (only on highlighted cards)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!highlightType) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPointerStyles({
      "--pointer-x": `${x}%`,
      "--pointer-y": `${y}%`,
      "--foil-opacity": "1",
    } as React.CSSProperties);
  };

  const handlePointerLeave = () => {
    if (!highlightType) return;

    setPointerStyles({
      "--foil-opacity": "0",
    } as React.CSSProperties);
  };

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

    // Finally, fetch from GitHub API as fallback (queued with rate limiting)
    fetchGitHubProfile(username)
      .then((profileData) => {
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
              }),
            );
          } catch (e) {
            console.warn(`Failed to cache profile for ${username}`);
          }
        }
      })
      .catch((error) => {
        console.error(`Failed to load profile for ${username}:`, error.message);
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

  // Determine the highlight CSS class
  const highlightClass =
    highlightType === "gold"
      ? styles.highlight
      : highlightType === "silver"
        ? styles.silverHighlight
        : highlightType === "diamond"
          ? styles.diamondHighlight
          : "";

  return (
    <div
      className={`${styles.card} ${highlightClass}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={pointerStyles}
    >
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
        {user.bio && <p className={styles.bio}>{user.bio}</p>}
        <div className={styles.stats}>
          <span>
            <strong>{user.public_repos}</strong> repos
          </span>
          <span>
            <strong>{user.followers}</strong> followers
          </span>
        </div>
        {(highlightType || sponsorUrl) && (
          <div className={styles.buttonRow}>
            {highlightType === "gold" && (
              <div className={styles.badge}>★ New Light</div>
            )}
            {sponsorUrl && (
              <a
                href={sponsorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sponsorButton}
              >
                ♥ Sponsor
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubProfileCard;
