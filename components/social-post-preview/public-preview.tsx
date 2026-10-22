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
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col gap-6 bg-white px-4 pb-6">
      <header className="sticky top-0 z-30 -mx-4 flex items-center gap-3 border-b border-border/50 bg-white/95 px-4 pt-4 pb-3 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <span className="mr-auto text-sm font-semibold tracking-tight text-foreground">Preview</span>
        <div className="flex min-w-0 flex-col items-end gap-1">
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
        <PreviewCommentsPanel previewId={post.id} initialComments={initialComments} />
      </header>
      {post.platforms.includes("instagram") ? <InstagramFeedCard profile={profile} post={post} /> : null}
      {post.platforms.includes("x") ? <XCard profile={profile} post={post} /> : null}
    </div>
  );
}
