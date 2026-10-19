"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { sheetCellHtml } from "@/lib/sheet-format";

const COPIED_FEEDBACK_MS = 1500;

async function writeClipboard(text: string, asSheetCell: boolean) {
  if (asSheetCell && typeof ClipboardItem !== "undefined" && text.includes("\n")) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([sheetCellHtml(text)], { type: "text/html" }),
        }),
      ]);
      return;
    } catch {
      // Some browsers reject HTML clipboard items; plain text still works.
    }
  }
  await navigator.clipboard.writeText(text);
}

/** Copies text with a toast and a short-lived `copiedKey` for check-mark feedback. */
export function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async (key: string, text: string, message: string, opts?: { sheetCell?: boolean }) => {
    try {
      await writeClipboard(text, opts?.sheetCell ?? false);
      toast.success(message);
      setCopiedKey(key);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedKey(null), COPIED_FEEDBACK_MS);
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  }, []);

  return { copiedKey, copy };
}
