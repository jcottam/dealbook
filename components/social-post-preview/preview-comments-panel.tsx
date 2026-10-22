"use client";

import { useCallback, useEffect, useSyncExternalStore, useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { PreviewComment } from "@/lib/social-post-preview/types";

const AUTHOR_STORAGE_KEY = "media-utils-preview-comment-author";
const AUTHOR_STORAGE_EVENT = "media-utils-preview-comment-author-change";
const COMMENT_POLL_MS = 10_000;

function readStoredAuthor(): string {
  try {
    return localStorage.getItem(AUTHOR_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeStoredAuthor(value: string) {
  try {
    localStorage.setItem(AUTHOR_STORAGE_KEY, value);
    window.dispatchEvent(new Event(AUTHOR_STORAGE_EVENT));
  } catch {
    /* ignore */
  }
}

function subscribeStoredAuthor(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(AUTHOR_STORAGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(AUTHOR_STORAGE_EVENT, handler);
  };
}

function useStoredAuthor() {
  return useSyncExternalStore(subscribeStoredAuthor, readStoredAuthor, () => "");
}

type Props = {
  previewId: string;
  initialComments: PreviewComment[];
};

function formatCommentTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PreviewCommentsPanel({ previewId, initialComments }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PreviewComment[]>(initialComments);
  const [loaded, setLoaded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const storedAuthor = useStoredAuthor();
  const [authorOverride, setAuthorOverride] = useState<string | null>(null);
  const author = authorOverride ?? storedAuthor;
  const [text, setText] = useState("");

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/social-post-preview/${previewId}/comments`);
      if (!res.ok) return;
      const data = (await res.json()) as { comments?: PreviewComment[] };
      setComments(data.comments ?? []);
      setLoaded(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [previewId]);

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "hidden") return;
      void refresh({ silent: true });
    };

    const id = window.setInterval(poll, COMMENT_POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedAuthor = author.replace(/\s+/g, " ").trim();
    const trimmedText = text.trim();
    if (!trimmedAuthor) {
      toast.error("Add your name before sending.");
      return;
    }
    if (!trimmedText) {
      toast.error("Write a comment before sending.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/social-post-preview/${previewId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: trimmedAuthor, text: trimmedText, website: "" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Could not post comment.");
        return;
      }
      const data = (await res.json()) as { comment: PreviewComment };
      setComments((prev) => [...prev, data.comment]);
      setText("");
      writeStoredAuthor(trimmedAuthor);
      setAuthorOverride(null);
      setOpen(false);
      toast.success("Comment posted.");
    } finally {
      setSubmitting(false);
    }
  }

  const count = comments.length;

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="relative size-10 shrink-0 rounded-full"
        aria-expanded={open}
        aria-label={count ? `Comments, ${count} total` : "Comments"}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="size-5" aria-hidden />
        {count > 0 ? (
          <span
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums ring-2 ring-white"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) void refresh();
        }}
      >
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle>Comments</SheetTitle>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {loading && !loaded ? (
                <li className="text-sm text-muted-foreground">Loading comments…</li>
              ) : null}
              {!loading && loaded && comments.length === 0 ? (
                <li className="text-sm text-muted-foreground">No comments yet. Be the first to leave feedback.</li>
              ) : null}
              {comments.map((c) => (
                <li key={c.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{c.author}</span>
                    <time
                      dateTime={c.createdAt}
                      suppressHydrationWarning
                      className="shrink-0 text-[11px] text-muted-foreground tabular-nums"
                    >
                      {formatCommentTime(c.createdAt)}
                    </time>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{c.text}</p>
                </li>
              ))}
            </ul>

            <form onSubmit={onSubmit} className="space-y-3 border-t border-border bg-muted/30 px-4 py-4">
              <div className="hidden" aria-hidden>
                <label htmlFor="preview-comment-website">Website</label>
                <input id="preview-comment-website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preview-comment-author">Your name</Label>
                <Input
                  id="preview-comment-author"
                  value={author}
                  onChange={(e) => setAuthorOverride(e.target.value)}
                  placeholder="Required"
                  maxLength={80}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preview-comment-text">Comment</Label>
                <Textarea
                  id="preview-comment-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What should change?"
                  rows={3}
                  maxLength={2000}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Posting…" : "Post comment"}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
