/**
 * Swizzled to add PageContributors component to documentation page footers.
 * Displays GitHub contributors for each doc page based on file path.
 * Original wrapper pattern from Docusaurus theme customization.
 */
import React from "react";
import Footer from "@theme-original/DocItem/Footer";
import type FooterType from "@theme/DocItem/Footer";
import { useDoc } from "@docusaurus/plugin-content-docs/client";
import PageContributors from "@site/src/components/PageContributors";
import type { WrapperProps } from "@docusaurus/types";

type Props = WrapperProps<typeof FooterType>;

export default function FooterWrapper(props: Props): React.ReactElement {
  // Safely try to get doc metadata, return basic footer if not in doc context
  let filePath = null;
  try {
    const { metadata } = useDoc();
    const editUrl = metadata.editUrl;

    // Extract file path from edit URL
    // Example: https://github.com/ublue-os/bluefin-docs/tree/main/docs/installation.md
    if (editUrl) {
      const match = editUrl.match(/\/(?:edit|tree)\/[^/]+\/(.+)$/);
      if (match) {
        filePath = match[1];
      }
    }
  } catch (error) {
    // Not in a doc context, just render basic footer
    return <Footer {...props} />;
  }

  return (
    <>
      <Footer {...props} />
      {filePath && <PageContributors filePath={filePath} />}
    </>
  );
}
