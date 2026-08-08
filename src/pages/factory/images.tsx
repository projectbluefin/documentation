import React from "react";
import FactoryShell from "../../components/factory/FactoryShell";
import ImagesPanels from "../../components/factory/panels/ImagesPanels";

export default function FactoryImagesPage(): React.JSX.Element {
  return (
    <FactoryShell pathname="/factory/images">
      {(s) => <ImagesPanels s={s} />}
    </FactoryShell>
  );
}
