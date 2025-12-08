import React from 'react';
import OriginalBlogPostPage from '@theme-original/BlogPostPage';
import type BlogPostPageType from '@theme/BlogPostPage';
import type {WrapperProps} from '@docusaurus/types';
import GiscusComments from '@site/src/components/GiscusComments';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';

type Props = WrapperProps<typeof BlogPostPageType>;

function BlogPostPageContent(): JSX.Element {
  const {metadata} = useBlogPost();
  const {frontMatter} = metadata;

  // Only show comments if not explicitly hidden
  const showComments = !frontMatter.hide_comments && metadata.permalink;

  return (
    <>
      {showComments && (
        <div className="margin-vert--xl">
          <GiscusComments />
        </div>
      )}
    </>
  );
}

export default function BlogPostPage(props: Props): JSX.Element {
  return (
    <>
      <OriginalBlogPostPage {...props} />
      <BlogPostPageContent />
    </>
  );
}
