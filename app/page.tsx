import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <AdminShell title="Dashboard" description="DealBook admin tools">
      <div className="grid gap-4 md:grid-cols-2 lg:max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Video clipper</CardTitle>
            <CardDescription>
              Trim Mimir proxy URLs or local files, export small clips, and transcribe selections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/tools/clipper">Open tool</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Social hub</CardTitle>
            <CardDescription>
              Calendar and media review will be rebuilt here. Legacy hub remains under{" "}
              <code className="text-xs">legacy/hub</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AdminShell>
  );
}
