import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { VideoReframe } from "@/components/reframe/video-reframe";
import { getTool } from "@/lib/tools";

const tool = getTool("reframe");

export const metadata: Metadata = { title: tool.title, description: tool.description };

export default function ReframePage() {
  return (
    <AdminShell title={tool.title} description={tool.description}>
      <VideoReframe />
    </AdminShell>
  );
}
