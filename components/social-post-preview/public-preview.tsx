import { InstagramFeedCard } from "@/components/social-post-preview/mockups/instagram-feed-card";
import { XCard } from "@/components/social-post-preview/mockups/x-card";
import { getSocialProfile } from "@/lib/social-profiles";
import type { PublicSocialPost } from "@/lib/social-post-preview/types";

type Props = {
  post: PublicSocialPost;
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

export function PublicPreview({ post }: Props) {
  const profile = getSocialProfile(post.profileId);
  const updatedLabel = formatUpdatedAt(post.updatedAt);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 bg-white px-4 py-6">
      <header className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
        <span className="text-sm font-semibold tracking-tight text-foreground">Preview</span>
        <time dateTime={post.updatedAt} className="text-right text-[11px] leading-none text-muted-foreground tabular-nums">
          Updated {updatedLabel}
        </time>
      </header>
      {post.platforms.includes("instagram") ? <InstagramFeedCard profile={profile} post={post} /> : null}
      {post.platforms.includes("x") ? <XCard profile={profile} post={post} /> : null}
    </div>
  );
}
