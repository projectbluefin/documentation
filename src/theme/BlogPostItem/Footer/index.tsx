import React, { type ReactNode } from "react";
import Footer from "@theme-original/BlogPostItem/Footer";
import type FooterType from "@theme/BlogPostItem/Footer";
import { useBlogPost } from "@docusaurus/plugin-content-blog/client";
import PageContributors from "@site/src/components/PageContributors";
import type { WrapperProps } from "@docusaurus/types";

type Props = WrapperProps<typeof FooterType>;

export default function FooterWrapper(props: Props): ReactNode {
  const { metadata } = useBlogPost();
  const editUrl = metadata.editUrl;

  // Extract file path from edit URL
  // Example: https://github.com/ublue-os/bluefin-docs/edit/main/blog/2024-12-30-ublue-2024-wrapup.md
  let filePath = null;
  if (editUrl) {
    const match = editUrl.match(/\/(?:edit|tree)\/[^/]+\/(.+)$/);
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
