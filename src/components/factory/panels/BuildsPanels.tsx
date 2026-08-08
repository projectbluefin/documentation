import React from "react";
import { BuildsSection, type FactoryLive } from "../../HiveFactoryDashboard";

export default function BuildsPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  return <BuildsSection s={s} />;
}
