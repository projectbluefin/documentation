import React from "react";
import Unavailable from "../Unavailable";
import type { FactoryLive } from "../../HiveFactoryDashboard";

export default function ApplicationsPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  void s;
  return (
    <Unavailable
      what="Applications"
      reason="The application catalog and Flathub attribution are being built. Nothing is hidden here and nothing is failing — this view genuinely has no data yet."
    />
  );
}
