import React from "react";
import Unavailable from "../Unavailable";
import type { FactoryLive } from "../../HiveFactoryDashboard";

export default function MetricsPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  void s;
  return (
    <Unavailable
      what="Metrics"
      reason="Adoption, ecosystem share, delivery and security posture are being built. Nothing is hidden here and nothing is failing — this view genuinely has no data yet."
    />
  );
}
