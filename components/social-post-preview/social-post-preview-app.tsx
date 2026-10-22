"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { InstagramFeedCard } from "@/components/social-post-preview/mockups/instagram-feed-card";
import { XCard } from "@/components/social-post-preview/mockups/x-card";
import { InstagramFieldsSection } from "@/components/social-post-preview/instagram-fields";
import { MediaSection } from "@/components/social-post-preview/media-section";
import { PlatformToggles } from "@/components/social-post-preview/platform-toggles";
import { ShareBlockers } from "@/components/social-post-preview/share-blockers";
import { ShareHistory } from "@/components/social-post-preview/share-history";
import { XFieldsSection } from "@/components/social-post-preview/x-fields";
import { shouldShowShareBlockers, validateForShare } from "@/lib/social-post-preview/checks";
import { normalizePost, toPublicPost } from "@/lib/social-post-preview/defaults";
import { previewShareUrl } from "@/lib/social-post-preview/share-url";
import type { PreviewPostSummary, SocialPost } from "@/lib/social-post-preview/types";
import { getSocialProfile } from "@/lib/social-profiles";
import { useCopy } from "@/hooks/use-copy";

type Tab = "editor" | "history";

export function SocialPostPreviewApp() {
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const editParam = params.get("edit");
  const [tab, setTab] = useState<Tab>(tabParam === "history" ? "history" : "editor");
  const [draft, setDraft] = useState<SocialPost>(() => normalizePost({}));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [history, setHistory] = useState<PreviewPostSummary[]>([]);
  const [saving, setSaving] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const { copy, copiedKey } = useCopy();

  const validation = useMemo(() => validateForShare(draft), [draft]);
  const showShareBlockers = useMemo(() => shouldShowShareBlockers(draft), [draft]);
  const publicPost = useMemo(() => toPublicPost({ ...draft, id: editingId ?? draft.id }), [draft, editingId]);
  const profile = getSocialProfile(draft.profileId);

  const refreshHistory = useCallback(async () => {
    const res = await fetch("/api/social-post-preview");
    if (!res.ok) return;
    const data = await res.json();
    setHistory(data.items ?? []);
  }, []);

  useEffect(() => {
    if (tab !== "history") return;
    let active = true;
    void fetch("/api/social-post-preview")
      .then((r) => r.json())
      .then((data) => {
        if (active) setHistory(data.items ?? []);
      });
    return () => {
      active = false;
    };
  }, [tab]);

  const loadForEdit = useCallback(async (id: string) => {
    const res = await fetch(`/api/social-post-preview/${id}`);
    if (!res.ok) {
      toast.error("Could not load that preview.");
      return;
    }
    const post = normalizePost(await res.json());
    setDraft(post);
    setEditingId(id);
    setEditingName(post.name);
    setSavedUrl(previewShareUrl(id));
    setTab("editor");
  }, []);

  useEffect(() => {
    if (!editParam) return;
    let active = true;
    void (async () => {
      const res = await fetch(`/api/social-post-preview/${editParam}`);
      if (!active || !res.ok) return;
      const post = normalizePost(await res.json());
      setDraft(post);
      setEditingId(editParam);
      setEditingName(post.name);
      setSavedUrl(previewShareUrl(editParam));
      setTab("editor");
    })();
    return () => {
      active = false;
    };
  }, [editParam]);

  const startNew = () => {
    setDraft(normalizePost({}));
    setEditingId(null);
    setEditingName("");
    setSavedUrl(null);
  };

  const updateDraft = (patch: Partial<SocialPost>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async (name: string) => {
    if (!validation.ok) return;
    const isUpdate = Boolean(editingId);
    setSaving(true);
    try {
      const body = { ...draft, name };
      const res = editingId
        ? await fetch(`/api/social-post-preview/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/social-post-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      const saved = normalizePost(data);
      setDraft(saved);
      setEditingId(saved.id);
      setEditingName(saved.name);
      const url = previewShareUrl(saved.id);
      setSavedUrl(url);
      setNameDialogOpen(false);
      await refreshHistory();
      await copy("share", url, isUpdate ? "Changes saved — link copied." : "Share link copied.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b pb-2">
        <Button type="button" variant={tab === "editor" ? "default" : "ghost"} size="sm" onClick={() => setTab("editor")}>
          Editor
        </Button>
        <Button type="button" variant={tab === "history" ? "default" : "ghost"} size="sm" onClick={() => setTab("history")}>
          Share history
        </Button>
      </div>

      {tab === "history" ? (
        <ShareHistory
          items={history}
          onRefresh={refreshHistory}
          onEdit={(id) => {
            void loadForEdit(id);
            if (typeof window !== "undefined") {
              const u = new URL(window.location.href);
              u.searchParams.set("edit", id);
              u.searchParams.delete("tab");
              window.history.replaceState(null, "", u.toString());
            }
          }}
        />
      ) : (
        <>
          {editingId ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <p>
                Editing <span className="font-medium">{editingName}</span>. Saving updates the same link.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={startNew}>Start a new post</Button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0 space-y-4">
              <PlatformToggles platforms={draft.platforms} onChange={(platforms) => updateDraft({ platforms })} />
              <MediaSection media={draft.media} onChange={(media) => updateDraft({ media })} />
              {draft.platforms.includes("instagram") ? (
                <InstagramFieldsSection
                  media={draft.media}
                  value={draft.instagram}
                  onChange={(instagram) => updateDraft({ instagram })}
                />
              ) : null}
              {draft.platforms.includes("x") ? (
                <XFieldsSection
                  media={draft.media}
                  value={draft.x}
                  onChange={(x) => updateDraft({ x })}
                  instagramCaption={draft.instagram.caption}
                  instagramOn={draft.platforms.includes("instagram")}
                />
              ) : null}
              {showShareBlockers && !validation.ok ? (
                <ShareBlockers issues={validation.issues} />
              ) : null}
              <Button
                type="button"
                disabled={!validation.ok || saving}
                onClick={() => {
                  if (editingId) void save(editingName);
                  else {
                    setLinkName("");
                    setNameDialogOpen(true);
                  }
                }}
              >
                {editingId ? "Save changes to link" : "Create share link"}
              </Button>
              {savedUrl ? (
                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <p className="break-all font-mono text-xs">{savedUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => copy("share", savedUrl, "Link copied")}>
                      {copiedKey === "share" ? "Copied" : "Copy link"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={savedUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3.5" aria-hidden />
                        Team view
                      </a>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="min-w-0 space-y-4">
              {draft.platforms.includes("instagram") ? (
                <InstagramFeedCard profile={profile} post={publicPost} />
              ) : null}
              {draft.platforms.includes("x") ? <XCard profile={profile} post={publicPost} /> : null}
            </div>
          </div>
        </>
      )}

      <AlertDialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Name this share link</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Only you see this name; the team view does not include it.</p>
          <Input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="e.g. Monday DealBook post" />
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setNameDialogOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!linkName.trim() || saving} onClick={() => void save(linkName.trim())}>
              Create link
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
