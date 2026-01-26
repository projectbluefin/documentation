/**
 * SSR-Safe: Uses typeof window checks before accessing localStorage.
 * Data fetching strategy: build-time JSON → localStorage cache → runtime API fallback
 */
import React, { useEffect, useState } from "react";
import styles from "./ProjectCard.module.css";
import reposData from "@site/static/data/github-repos.json";

interface GitHubRepoStats {
  stargazers_count: number;
  forks_count: number;
}

interface ProjectCardProps {
  name: string;
  description: string;
  sponsorUrl?: string;
  packageName?: string;
  icon?: string;
  githubRepo?: string;
}

const CACHE_KEY_PREFIX = "github_repo_";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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

const ProjectCard: React.FC<ProjectCardProps> = ({
  name,
  description,
  sponsorUrl,
  packageName,
  icon,
  githubRepo,
}) => {
  const [stats, setStats] = useState<GitHubRepoStats | null>(null);

  useEffect(() => {
    if (!githubRepo) return;

    // First, try pre-fetched build-time data
    const repoData = reposData[githubRepo];
    if (repoData) {
      setStats(repoData);
      return;
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${githubRepo}`;

    // Second, check localStorage cache
    if (typeof window !== "undefined") {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setStats(data);
            return;
          }
          localStorage.removeItem(cacheKey);
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }
    }

    // Finally, fetch from GitHub API via queue as fallback
    requestQueue
      .add(() =>
        fetch(`https://api.github.com/repos/${githubRepo}`).then((res) =>
          res.ok ? res.json() : null,
        ),
      )
      .then((data) => {
        if (data) {
          const repoStats = {
            stargazers_count: data.stargazers_count,
            forks_count: data.forks_count,
          };
          setStats(repoStats);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(
                cacheKey,
                JSON.stringify({ data: repoStats, timestamp: Date.now() }),
              );
            } catch {}
          }
        }
      })
      .catch(() => {});
  }, [githubRepo]);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return num.toString();
  };

  return (
    <div className={styles.card}>
      {icon ? (
        <img src={icon} alt={`${name} icon`} className={styles.iconImage} />
      ) : (
        <div className={styles.icon}>📦</div>
      )}
      <div className={styles.content}>
        <h3 className={styles.name}>
          {githubRepo ? (
            <a
              href={`https://github.com/${githubRepo}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {name}
            </a>
          ) : (
            name
          )}
        </h3>
        <p className={styles.description}>{description}</p>
        {packageName && (
          <p className={styles.packageName}>
            <code>{packageName}</code>
          </p>
        )}
        {stats && (
          <div className={styles.stats}>
            <span>⭐ {formatNumber(stats.stargazers_count)}</span>
            <span>🍴 {formatNumber(stats.forks_count)}</span>
          </div>
        )}
        {sponsorUrl && (
          <a
            href={sponsorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sponsorButton}
          >
            ❤️ Donate
          </a>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
