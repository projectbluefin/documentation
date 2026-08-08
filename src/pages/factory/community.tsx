import React from "react";
import FactoryShell from "../../components/factory/FactoryShell";
import CommunityPanels from "../../components/factory/panels/CommunityPanels";

export default function FactoryCommunityPage(): React.JSX.Element {
  return (
    <FactoryShell pathname="/factory/community">
      {(s) => <CommunityPanels s={s} />}
    </FactoryShell>
  );
}
