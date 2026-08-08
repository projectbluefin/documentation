import React from "react";
import FactoryShell from "../../components/factory/FactoryShell";
import ApplicationsPanels from "../../components/factory/panels/ApplicationsPanels";

export default function FactoryApplicationsPage(): React.JSX.Element {
  return (
    <FactoryShell pathname="/factory/applications">
      {(s) => <ApplicationsPanels s={s} />}
    </FactoryShell>
  );
}
