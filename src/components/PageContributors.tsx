/**
 * SSR-Safe: Uses typeof window checks before accessing localStorage.
 * Data fetching strategy: build-time JSON → localStorage cache → runtime API fallback
 */
import React, { useEffect, useState } from "react";
import styles from "./PageContributors.module.css";
import contributorsData from "@site/static/data/file-contributors.json";
import type {
  FileContributor,
  FileContributorsData,
} from "@site/src/types/data";

export type Contributor = FileContributor;

export interface PageContributorsProps {
  filePath: string;
  data?: FileContributorsData;
}

export function isDatasetUnavailable(
  data: FileContributorsData | undefined,
): boolean {
  if (!data) return true;
  if ("unavailable" in data && data.unavailable !== undefined) {
    return Boolean(data.unavailable);
  }
  if ("files" in data && data.files !== undefined) {
    return Object.keys(data.files).length === 0;
  }
  return Object.keys(data).length === 0;
}

export function getFileContributors(
  data: FileContributorsData | undefined,
  filePath: string,
): Contributor[] | undefined {
  if (!data) return undefined;
  if ("files" in data && data.files && typeof data.files === "object") {
    return (data.files as Record<string, Contributor[]>)[filePath];
  }
  return (data as Record<string, Contributor[]>)[filePath];
}

const CACHE_KEY_PREFIX = "file_contributors_";
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

// Bot accounts to filter out
const BOT_LOGINS = [
  "copilot-swe-agent",
  "Copilot",
  "dependabot",
  "renovate",
  "github-actions",
  "greenkeeper",
];

function isBotAccount(login: string): boolean {
  const lowerCaseLogin = login.toLowerCase();
  return (
    BOT_LOGINS.some((bot) => bot.toLowerCase() === lowerCaseLogin) ||
    lowerCaseLogin.endsWith("[bot]") ||
    lowerCaseLogin.includes("bot")
  );
}

const fetchFileContributors = async (
  filePath: string,
): Promise<Contributor[]> => {
  return requestQueue.add(async () => {
    const response = await fetch(
      `https://api.github.com/repos/projectbluefin/documentation/commits?path=${filePath}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Bluefin-Docs",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const commits = await response.json();

    // Extract unique contributors, filtering out bots
    const contributorMap = new Map<string, Contributor>();

    for (const commit of commits) {
      if (commit.author) {
        const { login, html_url, avatar_url } = commit.author;
        if (login && !isBotAccount(login) && !contributorMap.has(login)) {
          contributorMap.set(login, { login, html_url, avatar_url });
        }
      }
    }

    // Convert to array and sort alphabetically
    const contributors = Array.from(contributorMap.values());
    contributors.sort((a, b) => a.login.localeCompare(b.login));

    return contributors;
  });
};

const PageContributors: React.FC<PageContributorsProps> = ({
  filePath,
  data = contributorsData as unknown as FileContributorsData,
}) => {
  const [contributors, setContributors] = useState<Contributor[]>(() => {
    if (isDatasetUnavailable(data)) {
      return [];
    }
    const buildData = getFileContributors(data, filePath);
    return buildData ?? [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (isDatasetUnavailable(data)) {
      return false;
    }
    const buildData = getFileContributors(data, filePath);
    return !buildData;
  });

  useEffect(() => {
    // If the contributor dataset as a whole is unavailable, suppress visitor-side API fallback
    if (isDatasetUnavailable(data)) {
      setContributors([]);
      setLoading(false);
      return;
    }

    // First, try pre-fetched build-time data
    const buildData = getFileContributors(data, filePath);

    if (buildData && buildData.length > 0) {
      setContributors(buildData);
      setLoading(false);
      return;
    }

    // Second, check localStorage cache
    if (typeof window !== "undefined") {
      const cacheKey = `${CACHE_KEY_PREFIX}${filePath}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        try {
          const { data: cachedContributors, timestamp } =
            JSON.parse(cachedData);
          const age = Date.now() - timestamp;

          if (age < CACHE_DURATION) {
            setContributors(cachedContributors);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem(cacheKey);
          }
        } catch (_e) {
          localStorage.removeItem(cacheKey);
        }
      }
    }

    // Finally, fetch from GitHub API as fallback for cache misses on an available dataset
    fetchFileContributors(filePath)
      .then((fetchedData) => {
        setContributors(fetchedData);
        setLoading(false);

        // Cache in localStorage with 30-day expiry
        if (typeof window !== "undefined") {
          try {
            const cacheKey = `${CACHE_KEY_PREFIX}${filePath}`;
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data: fetchedData,
                timestamp: Date.now(),
              }),
            );
          } catch (_e) {
            console.warn(`Failed to cache contributors for ${filePath}`);
          }
        }
      })
      .catch((error) => {
        console.error(
          `Failed to load contributors for ${filePath}:`,
          error.message,
        );
        setLoading(false);
      });
  }, [filePath, data]);

  if (loading) {
    return null;
  }

  if (!contributors || contributors.length === 0) {
    return null;
  }

  return (
    <div className={styles.contributors}>
      <h3>Contributors to this page</h3>
      <ul className={styles.wrapper}>
        {contributors.map((contributor) => (
          <li key={contributor.login} className={styles.contributor}>
            <a
              href={contributor.html_url}
              title={`@${contributor.login}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={contributor.avatar_url}
                alt={contributor.login}
                width={70}
                height={70}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PageContributors;
