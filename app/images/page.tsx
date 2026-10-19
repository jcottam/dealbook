import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { ImageUploader } from "@/components/images/image-uploader";
import { getTool } from "@/lib/tools";

const tool = getTool("images");

export const metadata: Metadata = { title: tool.title, description: tool.description };

export default function ImagesPage() {
  return (
    <AdminShell title={tool.title} description={tool.description}>
      <ImageUploader />
    </AdminShell>
  );
}
