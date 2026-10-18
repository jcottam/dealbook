import { Scissors, type LucideIcon } from "lucide-react";

export type Tool = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

/** Every tool lives at `/<slug>` (`app/<slug>/page.tsx`); add new tools here to list them in the sidebar and dashboard. */
export const tools: Tool[] = [
  {
    slug: "clipper",
    title: "Video clipper",
    description: "Trim videos from a URL or upload, export clips, and transcribe selections.",
    icon: Scissors,
  },
];

export function toolHref(tool: Tool) {
  return `/${tool.slug}`;
}

export function getTool(slug: string): Tool {
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}
