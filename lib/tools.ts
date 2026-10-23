import { ImageUp, LayoutTemplate, RectangleVertical, Scissors, type LucideIcon } from "lucide-react";

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
  {
    slug: "reframe",
    title: "Vertical reframe",
    description: "Turn landscape video into 9:16 for Reels and Stories, with control over the crop.",
    icon: RectangleVertical,
  },
  {
    slug: "images",
    title: "Image uploader",
    description: "Upload images and get public links to share with your team.",
    icon: ImageUp,
  },
  {
    slug: "social-post-preview",
    title: "Social Post Preview",
    description: "Assemble Instagram and X posts, preview them, and share a review link with your team.",
    icon: LayoutTemplate,
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
