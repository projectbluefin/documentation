import React from "react";
import { LiveSection, type FactoryLive } from "../../HiveFactoryDashboard";
import HiveSnapshot from "./HiveSnapshot";

export default function LivePanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  return (
    <>
      <HiveSnapshot />
      <LiveSection s={s} />
    </>
  );
}
