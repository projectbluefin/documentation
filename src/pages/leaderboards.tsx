import React from "react";
import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import { FactoryDataProvider } from "../components/factory/FactoryDataContext";
import type { DatasetKey } from "../components/factory/routes";
import { LeaderboardsSection } from "../components/HiveFactoryDashboard";
import styles from "../components/HiveFactoryDashboard.module.css";
import "../components/factory/tokens.css";
const DATASETS: DatasetKey[] = ["hiveHistory", "registry"];

export default function LeaderboardsPage(): React.JSX.Element {
  return (
    <Layout title="Leaderboards">
      <Head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Moments of Triumph — Bluefin Leaderboards"
          href="/feeds/moments-of-triumph.xml"
        />
      </Head>
      <div className="fxRoot">
        <main className={styles.lbPage}>
          <header className={styles.lbHero}>
            <div className={styles.lbHeroWordmark}>
              <img
                src="/img/bluefin-wordmark-light.svg"
                alt="Bluefin"
                className={styles.lbWordmarkLight}
              />
              <img
                src="/img/bluefin-wordmark-dark.svg"
                alt="Bluefin"
                className={styles.lbWordmarkDark}
              />
            </div>
            <Heading as="h1">Leaderboards</Heading>
          </header>
          <FactoryDataProvider datasets={DATASETS}>
            <LeaderboardsSection />
          </FactoryDataProvider>
        </main>
      </div>
    </Layout>
  );
}
