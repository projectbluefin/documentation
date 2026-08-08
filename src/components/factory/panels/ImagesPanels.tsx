import React from "react";
import Unavailable from "../Unavailable";
import type { FactoryLive } from "../../HiveFactoryDashboard";

export default function ImagesPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  void s;
  return (
    <Unavailable
      what="Images"
      reason="Published image lanes, freshness and provenance are being built from the GHCR package inventory. Nothing is hidden here and nothing is failing — this view genuinely has no data yet."
    />
  );
}
