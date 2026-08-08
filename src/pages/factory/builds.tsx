import React from "react";
import FactoryShell from "../../components/factory/FactoryShell";
import BuildsPanels from "../../components/factory/panels/BuildsPanels";

export default function FactoryBuildsPage(): React.JSX.Element {
  return (
    <FactoryShell pathname="/factory/builds">
      {(s) => <BuildsPanels s={s} />}
    </FactoryShell>
  );
}
