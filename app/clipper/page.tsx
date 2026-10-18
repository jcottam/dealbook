import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { VideoClipper } from "@/components/clipper/video-clipper";
import { getTool } from "@/lib/tools";

const tool = getTool("clipper");

export const metadata: Metadata = { title: tool.title, description: tool.description };

export default function ClipperPage() {
  return (
    <AdminShell title={tool.title} description={tool.description}>
      <VideoClipper />
    </AdminShell>
  );
}
