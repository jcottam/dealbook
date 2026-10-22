import type { PreviewShareIssue } from "@/lib/social-post-preview/types";

export function ShareBlockers({ issues }: { issues: PreviewShareIssue[] }) {
  if (!issues.length) return null;
  const title =
    issues.length === 1 ? issues[0].title : `${issues.length} things to fix before sharing`;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-50">
      <p className="font-medium">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {issues.map((issue) => (
          <li key={issue.title}>
            <span className="font-medium">{issue.title}</span>
            {issues.length > 1 ? ` — ${issue.fix}` : null}
          </li>
        ))}
      </ul>
      {issues.length === 1 ? <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">{issues[0].fix}</p> : null}
    </div>
  );
}
