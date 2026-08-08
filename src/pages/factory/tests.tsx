import React from "react";
import FactoryShell from "../../components/factory/FactoryShell";
import TestsPanels from "../../components/factory/panels/TestsPanels";

export default function FactoryTestsPage(): React.JSX.Element {
  return (
    <FactoryShell pathname="/factory/tests">
      {(s) => <TestsPanels s={s} />}
    </FactoryShell>
  );
}
