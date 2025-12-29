import React from "react";
import Footer from "@theme-original/DocItem/Footer";
import type FooterType from "@theme/DocItem/Footer";
import { useDoc } from "@docusaurus/plugin-content-docs/client";
import PageContributors from "@site/src/components/PageContributors";
import type { WrapperProps } from "@docusaurus/types";

type Props = WrapperProps<typeof FooterType>;

export default function FooterWrapper(props: Props): React.ReactElement {
  const { metadata } = useDoc();
  const editUrl = metadata.editUrl;

  // Extract file path from edit URL
  // Example: https://github.com/ublue-os/bluefin-docs/tree/main/docs/installation.md
  let filePath = null;
  if (editUrl) {
    const match = editUrl.match(/tree\/main\/(.+)$/);
    if (match) {
      filePath = match[1];
    }
  }

  return (
    <>
      <Footer {...props} />
      {filePath && <PageContributors filePath={filePath} />}
    </>
  );
}
