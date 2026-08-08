import React from "react";
import FactoryShell from "../../components/factory/FactoryShell";
import LivePanels from "../../components/factory/panels/LivePanels";

export default function FactoryOverviewPage(): React.JSX.Element {
  return (
    <FactoryShell pathname="/factory">
      {(s) => <LivePanels s={s} />}
    </FactoryShell>
  );
}
