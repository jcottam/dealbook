import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toolHref, tools } from "@/lib/tools";

export default function DashboardPage() {
  return (
    <AdminShell title="Dashboard" description="Tools to package and prepare content for social and production">
      <div className="grid gap-4 md:grid-cols-2 lg:max-w-3xl">
        {tools.map((tool) => (
          <Card key={tool.slug}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <tool.icon className="size-4" />
                {tool.title}
              </CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={toolHref(tool)}>Open tool</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>DealBook workspace</CardTitle>
            <CardDescription>
              Content calendar, research, and the legacy social hub live under{" "}
              <code className="text-xs">workspaces/dealbook</code>. Hub features will be rebuilt here over time.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AdminShell>
  );
}
