import React from "react";
import FactoryShell from "../../components/factory/FactoryShell";
import UserspacePanels from "../../components/factory/panels/UserspacePanels";

export default function FactoryUserspacePage(): React.JSX.Element {
  return (
    <FactoryShell pathname="/factory/userspace">
      {(s) => <UserspacePanels s={s} />}
    </FactoryShell>
  );
}
