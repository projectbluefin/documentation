import React from "react";
import Unavailable from "../Unavailable";
import type { FactoryLive } from "../../HiveFactoryDashboard";

export default function UserspacePanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  void s;
  return (
    <Unavailable
      what="Userspace"
      reason="The userspace image inventory and Flatpak runtime distribution are being built. Nothing is hidden here and nothing is failing — this view genuinely has no data yet."
    />
  );
}
