import React from "react";
import Layout from "@theme/Layout";
import { FactoryDataProvider } from "../components/factory/FactoryDataContext";
import type { DatasetKey } from "../components/factory/routes";
import { LeaderboardsSection } from "../components/HiveFactoryDashboard";
import "../components/factory/tokens.css";

const DATASETS: DatasetKey[] = ["hiveHistory", "registry"];

export default function LeaderboardsPage(): React.JSX.Element {
  return (
    <Layout title="Leaderboards">
      <div className="fxRoot">
        <main className="container margin-vert--lg">
          <h1>Leaderboards</h1>
          <FactoryDataProvider datasets={DATASETS}>
            <LeaderboardsSection />
          </FactoryDataProvider>
        </main>
      </div>
    </Layout>
  );
}
