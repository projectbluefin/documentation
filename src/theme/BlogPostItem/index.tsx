import React from "react";
import BlogPostItem from "@theme-original/BlogPostItem";
import type { Props } from "@theme/BlogPostItem";
import type { JSX } from "react";

export default function BlogPostItemWrapper(props: Props): JSX.Element {
  return (
    <>
      <BlogPostItem {...props} />
      {/* Giscus comments disabled */}
    </>
  );
}
