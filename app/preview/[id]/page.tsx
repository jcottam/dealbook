import type { Metadata } from "next";
import { PublicPreview } from "@/components/social-post-preview/public-preview";
import { readPublicPreviewPost } from "@/lib/social-post-preview/storage";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default async function PreviewSharePage({ params }: PageProps) {
  const { id } = await params;
  const post = await readPublicPreviewPost(id);

  if (!post) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-center text-muted-foreground">This preview is no longer available.</p>
      </main>
    );
  }

  return (
    <main>
      <PublicPreview post={post} />
    </main>
  );
}
