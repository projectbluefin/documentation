import React from "react";
import Layout from "@theme/Layout";
import PortalPrototype from "../components/portal/PortalPrototype";

const description =
  "The next generation Linux workstation, designed for reliability, performance, and sustainability.";

export default function PortalPrototypePage(): React.JSX.Element {
  return (
    <Layout title="Bluefin" description={description} noFooter>
      <PortalPrototype />
    </Layout>
  );
}
