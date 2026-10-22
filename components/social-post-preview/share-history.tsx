"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inferredTypeLabel } from "@/lib/social-post-preview/infer-type";
import { previewShareUrl } from "@/lib/social-post-preview/share-url";
import type { PreviewPostSummary } from "@/lib/social-post-preview/types";
import { useCopy } from "@/hooks/use-copy";

type Props = {
  items: PreviewPostSummary[];
  onEdit: (id: string) => void;
  onRefresh: () => void;
};

export function ShareHistory({ items, onEdit, onRefresh }: Props) {
  const { copy, copiedKey } = useCopy();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const deleteItem = async (id: string) => {
    const res = await fetch(`/api/social-post-preview/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setPendingDelete(null);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No share links yet.</p> : null}
      {items.map((item) => {
        const url = previewShareUrl(item.id);
        const platforms = item.platforms.map((p) => (p === "instagram" ? "Instagram" : "X")).join(", ");
        return (
          <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <div className="size-14 shrink-0 overflow-hidden rounded bg-muted">
              {item.thumbnailUrl ? (
                <Image src={item.thumbnailUrl} alt="" width={56} height={56} className="size-full object-cover" sizes="56px" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {platforms} · {inferredTypeLabel(item.instagramType)} · {new Date(item.updatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => copy(item.id, url, "Link copied")}>
                <Copy className="size-3.5" />
                {copiedKey === item.id ? "Copied" : "Copy link"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item.id)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" /> Team view
                </a>
              </Button>
              {pendingDelete === item.id ? (
                <Button type="button" size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>Confirm delete</Button>
              ) : (
                <Button type="button" size="sm" variant="ghost" onClick={() => setPendingDelete(item.id)}>
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
