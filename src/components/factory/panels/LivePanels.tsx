import React from "react";
import { LiveSection, type FactoryLive } from "../../HiveFactoryDashboard";

export default function LivePanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  return <LiveSection s={s} />;
}
