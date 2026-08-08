import React from "react";
import FactoryShell from "../../components/factory/FactoryShell";
import MetricsPanels from "../../components/factory/panels/MetricsPanels";

export default function FactoryMetricsPage(): React.JSX.Element {
  return (
    <FactoryShell pathname="/factory/metrics">
      {(s) => <MetricsPanels s={s} />}
    </FactoryShell>
  );
}
