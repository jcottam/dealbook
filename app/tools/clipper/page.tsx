import { AdminShell } from "@/components/admin-shell";
import { VideoClipper } from "@/components/clipper/video-clipper";

export default function ClipperPage() {
  return (
    <AdminShell title="Video clipper" description="Trim proxies and local files; export and transcribe short clips">
      <VideoClipper />
    </AdminShell>
  );
}
