import { InstagramFeedCard } from "@/components/social-post-preview/mockups/instagram-feed-card";
import { XCard } from "@/components/social-post-preview/mockups/x-card";
import { getSocialProfile } from "@/lib/social-profiles";
import type { PublicSocialPost } from "@/lib/social-post-preview/types";

type Props = {
  post: PublicSocialPost;
};

export function PublicPreview({ post }: Props) {
  const profile = getSocialProfile(post.profileId);
  const updated = new Date(post.updatedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 bg-neutral-100 px-4 py-8">
      {post.platforms.includes("instagram") ? <InstagramFeedCard profile={profile} post={post} /> : null}
      {post.platforms.includes("x") ? <XCard profile={profile} post={post} /> : null}
      <p className="text-center text-xs text-muted-foreground">
        Preview for review · view only · updated {updated}
      </p>
    </div>
  );
}
