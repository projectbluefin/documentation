import React from "react";
import { CommunitySection, type FactoryLive } from "../../HiveFactoryDashboard";

export default function CommunityPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  return <CommunitySection s={s} />;
}
