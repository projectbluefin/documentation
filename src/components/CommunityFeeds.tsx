import React from "react";
import Layout from "@theme/Layout";
import { CombinedFeedItems } from "../components/FeedItems";
import PackageSummary from "../components/PackageSummary";
import styles from "./CommunityFeeds.module.css";

const CommunityFeeds: React.FC = () => {
  return (
    <Layout
      title="Changelogs and Feeds"
      description="Stay up to date with Bluefin releases, discussions, and announcements. Stay frosty."
    >
      <div className="container margin-vert--lg">
        <div className={styles.overviewPanel}>
          <div className={styles.header}>
            <h1>Changelogs and Feeds</h1>
            <p className={styles.overviewLinks}>
              Need project-wide status? See <a href="/reports">Monthly Reports</a>{" "}
              for delivery summaries from <a href="https://todo.projectbluefin.io">todo.projectbluefin.io</a>.
            </p>
          </div>

          <div className={styles.packageSummaryGrid}>
            <PackageSummary feedKey="bluefinLtsReleases" title="Bluefin LTS" />
            <PackageSummary
              feedKey="bluefinReleases"
              title="Bluefin"
              filter={(item) => item.title.startsWith("stable-")}
            />
          </div>
        </div>

        <div className={styles.feedGrid}>
          <CombinedFeedItems
            title="Release Changelogs"
            feeds={[
              { feedId: "bluefinLtsReleases", label: "Bluefin LTS" },
              {
                feedId: "bluefinReleases",
                label: "Bluefin",
                filter: (item) => item.title.startsWith("stable-"),
              },
            ]}
            maxItems={20}
          />
        </div>

        <div className={styles.additionalLinks}>
          <h2>Additional Feeds</h2>
          <div className={styles.linkGrid}>
            <a
              href="https://docs.projectbluefin.io/blog/rss.xml"
              className={styles.resourceLink}
            >
              <strong>Blog RSS Feed</strong>
              <span>Subscribe to official blog posts and announcements</span>
            </a>
            <a
              href="https://github.com/ublue-os/bluefin/releases.atom"
              className={styles.resourceLink}
            >
              <strong>Releases Feed</strong>
              <span>Direct feed for Bluefin releases</span>
            </a>
            <a
              href="https://github.com/ublue-os/bluefin-lts/releases.atom"
              className={styles.resourceLink}
            >
              <strong>LTS Releases Feed</strong>
              <span>Direct feed for Bluefin LTS releases</span>
            </a>
            <a
              href="https://github.com/ublue-os/bluefin/discussions.atom"
              className={styles.resourceLink}
            >
              <strong>Discussions Feed</strong>
              <span>Community discussions and support topics</span>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CommunityFeeds;
