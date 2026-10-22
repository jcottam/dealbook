import Link from "next/link";
import { InstagramFeedCard } from "@/components/social-post-preview/mockups/instagram-feed-card";
import { PreviewCommentsPanel } from "@/components/social-post-preview/preview-comments-panel";
import { XCard } from "@/components/social-post-preview/mockups/x-card";
import { getSocialProfile } from "@/lib/social-profiles";
import { previewEditorPath } from "@/lib/social-post-preview/share-url";
import type { PreviewComment, PublicSocialPost } from "@/lib/social-post-preview/types";

type Props = {
  post: PublicSocialPost;
  canEdit?: boolean;
  initialComments?: PreviewComment[];
};

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function PublicPreview({ post, canEdit = false, initialComments = [] }: Props) {
  const profile = getSocialProfile(post.profileId);
  const updatedLabel = formatUpdatedAt(post.updatedAt);

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
          <time
            dateTime={post.updatedAt}
            suppressHydrationWarning
            className="text-right text-[11px] leading-none text-muted-foreground tabular-nums"
          >
            Updated {updatedLabel}
          </time>
        </div>
      </header>
      {post.platforms.includes("instagram") ? <InstagramFeedCard profile={profile} post={post} /> : null}
      {post.platforms.includes("x") ? <XCard profile={profile} post={post} /> : null}
    </div>
  );
}
