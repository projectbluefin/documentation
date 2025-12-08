import React from 'react';
import OriginalBlogPostPage from '@theme-original/BlogPostPage';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';
import GiscusComments from '@site/src/components/GiscusComments';

export default function BlogPostPage(props) {
  const { metadata } = useBlogPost();
  const { frontMatter } = metadata;

  return (
    <>
      <OriginalBlogPostPage {...props} />
      {/* Only show comments on blog posts, not on the blog list pages */}
      {!frontMatter.hide_comments && metadata.permalink && (
        <div className="margin-vert--xl">
          <GiscusComments />
        </div>
      )}
    </>
  );
}
