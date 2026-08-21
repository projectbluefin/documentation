import React from "react";
import FactoryShell from "../../components/factory/FactoryShell";
import { CommunitySection } from "../../components/HiveFactoryDashboard";

export default function FactoryCommunityPage(): React.JSX.Element {
  return (
    <FactoryShell pathname="/factory/community">
      {(s) => <CommunitySection s={s} />}
    </FactoryShell>
  );
}
