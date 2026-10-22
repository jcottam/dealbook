import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { SocialPostPreviewApp } from "@/components/social-post-preview/social-post-preview-app";
import { getTool } from "@/lib/tools";

const tool = getTool("social-post-preview");

export const metadata: Metadata = { title: tool.title, description: tool.description };

export default function SocialPostPreviewPage() {
  return (
    <AdminShell title={tool.title} description={tool.description}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <SocialPostPreviewApp />
      </Suspense>
    </AdminShell>
  );
}
