import React from "react";
import Layout from "@theme/Layout";
import FeedItems from "../components/FeedItems";
import PackageSummary from "../components/PackageSummary";
import styles from "./CommunityFeeds.module.css";

const CommunityFeeds: React.FC = () => {
  return (
    <Layout
      title="Changelogs and Feeds"
      description="Stay up to date with Bluefin releases, discussions, and announcements. Stay frosty."
    >
      <div className="container margin-vert--lg">
        <div className={styles.header}>
          <h1>Changelogs and Feeds</h1>
          <p>
            Stay up to date with the latest Bluefin releases, community
            discussions, and announcements. Stay frosty.
          </p>
        </div>

        {/* Package Summary Boxes */}
        <div className={styles.packageSummaryGrid}>
          <PackageSummary feedKey="bluefinReleases" title="Bluefin Stable" />
          <PackageSummary feedKey="bluefinLtsReleases" title="Bluefin LTS" />
        </div>

        <div className={styles.feedGrid}>
          <div className={styles.feedColumn}>
            <FeedItems
              feedId="bluefinReleases"
              title="Bluefin and Bluefin GTS Releases"
              maxItems={5}
              showDescription={false}
            />
            <FeedItems
              feedId="bluefinAnnouncements"
              title="Announcements"
              maxItems={3}
              showDescription={false}
            />
          </div>
          <div className={styles.feedColumn}>
            <FeedItems
              feedId="bluefinLtsReleases"
              title="Bluefin LTS Releases"
              maxItems={5}
              showDescription={false}
            />
            <FeedItems
              feedId="bluefinDiscussions"
              title="Community Discussions"
              maxItems={5}
              showDescription={false}
            />
          </div>
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
