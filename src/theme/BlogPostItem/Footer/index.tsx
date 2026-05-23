import React from "react";
import Footer from "@theme-original/BlogPostItem/Footer";
import type FooterType from "@theme/BlogPostItem/Footer";
import type { WrapperProps } from "@docusaurus/types";
import { useBlogPost } from "@docusaurus/plugin-content-blog/client";
import GiscusComments from "@site/src/components/GiscusComments";

type Props = WrapperProps<typeof FooterType>;

export default function BlogPostItemFooterWrapper(
  props: Props
): React.ReactElement {
  const { isBlogPostPage } = useBlogPost();

  return (
    <>
      <Footer {...props} />
      {isBlogPostPage && <GiscusComments />}
    </>
  );
}
