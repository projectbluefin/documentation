import React from "react";
import styles from "./ReportLeaderboard.module.css";

const BOT_NAMES: Record<string, true> = {
  "hivecommons-hive": true,
  "kubestellar-hive": true,
  mergeraptor: true,
  "renovate-bot": true,
  "github-actions": true,
  "semantic-release-bot": true,
  copilot: true,
  "web-flow": true,
  scanner: true,
  "sec-check": true,
  "ci-maintainer": true,
  reviewer: true,
  architect: true,
  quality: true,
  codex: true,
  claude: true,
  unknown: true,
  "hive-agent": true,
};

function isBotLogin(login: string): boolean {
  const l = login.toLowerCase();
  return (
    Boolean(BOT_NAMES[l]) ||
    l.includes("[bot]") ||
    l.endsWith("-bot") ||
    /^(renovate|dependabot|github-actions|copilot|semantic-release-bot|mergeraptor|allcontributors|imgbot|stale|snyk|scanner|sec-check|ci-maintainer|reviewer|architect|hivecommons|kubestellar)/.test(
      l,
    )
  );
}
export interface LeaderboardHero {
  rank: number;
  login: string;
  avatarUrl?: string;
  contributions: number;
  projects?: number;
  repos?: string[];
  badge?: {
    label: string;
    color: string;
    title: string;
  };
  isNew?: boolean;
}

export interface NewLightHero {
  login: string;
  avatarUrl?: string;
  repos?: string[];
}

export interface ReportLeaderboardProps {
  title?: string;
  subtitle?: string;
  period?: string;
  heroes: LeaderboardHero[];
  newLights?: NewLightHero[];
}

export default function ReportLeaderboard({
  title = "Hive Leaderboard: Community Heroes",
  subtitle = "Celebrating our top community builders across the Project Bluefin factory",
  period,
  heroes,
  newLights = [],
}: ReportLeaderboardProps): React.JSX.Element {
  if (!heroes || heroes.length === 0) {
    return <></>;
  }

  // Published snapshots predate bot filtering in the generator, so filter here too.
  const humanHeroes = heroes.filter((h) => !isBotLogin(h.login));
  const rosterHeroes = humanHeroes.slice(0, 20).map((h, idx) => ({
    ...h,
    rank: idx + 1,
  }));
  const filteredNewLights = newLights.filter((h) => !isBotLogin(h.login));
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>
            <span>🏆</span> Hive Leaderboard
          </span>
          {period && (
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--ifm-color-emphasis-600)",
                fontWeight: 600,
              }}
            >
              {period}
            </span>
          )}
        </div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      {/* ── Ranked Roster (#1 - #20) ── */}
      {rosterHeroes.length > 0 && (
        <div className={styles.tableWrapper}>
          <div className={styles.tableHeader}>
            <span className={styles.colRank}>Rank</span>
            <span className={styles.colUser}>Contributor</span>
            <span className={styles.colCount}>Impact</span>
            <span className={styles.colRepos}>Projects</span>
            <span className={styles.colBadge}>Milestone</span>
          </div>
          {rosterHeroes.map((hero) => {
            const avatar =
              hero.avatarUrl || `https://github.com/${hero.login}.png?size=32`;
            const repos = hero.repos || [];

            return (
              <a
                key={hero.login}
                href={`https://github.com/${hero.login}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.tableRow}
              >
                <span className={styles.colRank}>
                  #{String(hero.rank).padStart(2, "0")}
                </span>
                <span className={styles.colUser}>
                  <img
                    src={avatar}
                    alt={hero.login}
                    className={styles.rowAvatar}
                    loading="lazy"
                  />
                  <span className={styles.rowLogin}>@{hero.login}</span>
                </span>
                <span className={styles.colCount}>
                  {hero.contributions} {hero.contributions === 1 ? "PR" : "PRs"}
                </span>
                <span className={styles.colRepos}>
                  {repos.slice(0, 3).map((repo) => (
                    <span key={repo} className={styles.repoChip}>
                      {repo}
                    </span>
                  ))}
                  {repos.length > 3 && (
                    <span className={styles.repoMore}>+{repos.length - 3}</span>
                  )}
                </span>
                <span className={styles.colBadge}>
                  {hero.badge ? (
                    <span
                      className={styles.heroBadge}
                      style={{
                        borderColor: hero.badge.color,
                        color: hero.badge.color,
                        marginTop: 0,
                      }}
                    >
                      {hero.badge.label}
                    </span>
                  ) : hero.isNew ? (
                    <span
                      className={styles.heroBadge}
                      style={{
                        borderColor: "var(--ifm-color-primary)",
                        color: "var(--ifm-color-primary)",
                        marginTop: 0,
                      }}
                    >
                      New Light
                    </span>
                  ) : null}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* ── New Lights Celebration ── */}
      {filteredNewLights.length > 0 && (
        <div className={styles.newLightsSection}>
          <div className={styles.newLightsHeader}>
            <span>✨</span>
            <h4 className={styles.newLightsTitle}>
              Welcome New Lights ({filteredNewLights.length})
            </h4>
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              margin: 0,
              color: "var(--ifm-color-emphasis-700)",
            }}
          >
            First-time guardians who made their mark in the factory this month.
          </p>
          <div className={styles.newLightsList}>
            {filteredNewLights.map((hero) => {
              const avatar =
                hero.avatarUrl ||
                `https://github.com/${hero.login}.png?size=32`;
              return (
                <a
                  key={hero.login}
                  href={`https://github.com/${hero.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.newLightChip}
                >
                  <img
                    src={avatar}
                    alt={hero.login}
                    className={styles.newLightAvatar}
                    loading="lazy"
                  />
                  <span>@{hero.login}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
