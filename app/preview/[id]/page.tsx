import type { Metadata } from "next";
import { headers } from "next/headers";
import { PublicPreview } from "@/components/social-post-preview/public-preview";
import { isMediaUtilsAdmin } from "@/lib/media-utils-admins";
import { listPreviewComments } from "@/lib/social-post-preview/comments";
import { readPublicPreviewPost } from "@/lib/social-post-preview/storage";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default async function PreviewSharePage({ params }: PageProps) {
  const { id } = await params;
  const canEdit = isMediaUtilsAdmin(await headers());
  const post = await readPublicPreviewPost(id);
  const initialComments = post ? (await listPreviewComments(id)) ?? [] : [];

  if (!post) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-center text-muted-foreground">This preview is no longer available.</p>
      </main>
    );
  }

  return (
    <main>
      <PublicPreview post={post} canEdit={canEdit} initialComments={initialComments} />
    </main>
  );
}
