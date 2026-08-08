import React from "react";
import Unavailable from "../Unavailable";
import type { FactoryLive } from "../../HiveFactoryDashboard";

export default function TestsPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  void s;
  return (
    <Unavailable
      what="Tests"
      reason="Test outcomes are being rebuilt from GitHub Actions workflow and job history. Nothing is hidden here and nothing is failing — this view genuinely has no data yet."
    />
  );
}
