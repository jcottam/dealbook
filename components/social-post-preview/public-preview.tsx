import Link from "next/link";
import { InstagramFeedCard } from "@/components/social-post-preview/mockups/instagram-feed-card";
import { PreviewCommentsPanel } from "@/components/social-post-preview/preview-comments-panel";
import { PreviewUpdatedAt } from "@/components/social-post-preview/preview-updated-at";
import { XCard } from "@/components/social-post-preview/mockups/x-card";
import { getSocialProfile } from "@/lib/social-profiles";
import { previewEditorPath } from "@/lib/social-post-preview/share-url";
import type { PreviewComment, PublicSocialPost } from "@/lib/social-post-preview/types";

type Props = {
  post: PublicSocialPost;
  canEdit?: boolean;
  initialComments?: PreviewComment[];
};

export function PublicPreview({ post, canEdit = false, initialComments = [] }: Props) {
  const profile = getSocialProfile(post.profileId);

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col gap-6 bg-white px-4 py-6">
      <PreviewCommentsPanel previewId={post.id} initialComments={initialComments} />
      <header className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
        <span className="text-sm font-semibold tracking-tight text-foreground">Preview</span>
        <div className="flex flex-col items-end gap-1">
          {canEdit ? (
            <Link
              href={previewEditorPath(post.id)}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Edit Preview
            </Link>
          ) : null}
          <PreviewUpdatedAt iso={post.updatedAt} />
        </div>
      </header>
      {post.platforms.includes("instagram") ? <InstagramFeedCard profile={profile} post={post} /> : null}
      {post.platforms.includes("x") ? <XCard profile={profile} post={post} /> : null}
    </div>
  );
}
