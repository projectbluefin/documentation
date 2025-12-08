import React from 'react';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import BlogPostItem from '@theme-original/BlogPostItem';
import type {Props} from '@theme/BlogPostItem';
import GiscusComments from '@site/src/components/GiscusComments';

export default function BlogPostItemWrapper(props: Props): JSX.Element {
  const {metadata, isBlogPostPage} = useBlogPost();
  const {frontMatter} = metadata;

  return (
    <>
      <BlogPostItem {...props} />
      {/* Only show comments on full blog post pages, not in lists */}
      {isBlogPostPage && !frontMatter.hide_comments && (
        <div className="margin-vert--xl">
          <GiscusComments />
        </div>
      )}
    </>
  );
}
