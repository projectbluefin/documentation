import React from "react";
import Layout from "@theme/Layout";
import FirehoseFeed from "../components/FirehoseFeed";
import styles from "./CommunityFeeds.module.css";

const CommunityFeeds: React.FC = () => {
  return (
    <Layout
      title="Changelogs and Feeds"
      description="Stay up to date with Bluefin releases, discussions, and announcements. Stay frosty."
    >
      <div className="container margin-vert--lg">
        <div className={styles.hero}>
          <img
            src="/img/angry-dinosaur.webp"
            alt="Bluefin angry dinosaur mascot"
            className={styles.heroDino}
          />
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>Changelogs</h1>
            <p className={styles.heroSubtitle}>
              The Firehose - track updates from Bluefin, Homebrew, and Flathub
            </p>
            <p className={styles.heroLinks}>
              Need project-wide status? See <a href="/reports">Monthly Reports</a>{" "}
              for delivery summaries from <a href="https://todo.projectbluefin.io">todo.projectbluefin.io</a>.
            </p>
          </div>
        </div>

        <FirehoseFeed />
      </div>
    </Layout>
  );
};

export default CommunityFeeds;
