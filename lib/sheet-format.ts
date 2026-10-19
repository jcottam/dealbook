/**
 * Plain text for the DealBook content calendar ("Source w/ timestamps" column), shared by images and clips:
 *   Title slide: https://…/images/…/_DSC0457.jpg
 *   Musk quote (00:04:55–00:05:17): https://…/clips/…/clip.mp4
 *   "I have no problem being hated…"
 */

export type SheetEntry = {
  url: string;
  label?: string | null;
  range?: { start: number; end: number } | null;
  transcript?: string | null;
};

function hms(total: number) {
  const s = Math.max(0, Math.floor(total));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function formatTimecodeRange(range: { start: number; end: number }) {
  return `${hms(range.start)}–${hms(range.end)}`;
}

export function sheetLine({ url, label, range, transcript }: SheetEntry): string {
  const name = label?.trim() ?? "";
  const timing = range ? formatTimecodeRange(range) : "";
  const prefix = name && timing ? `${name} (${timing})` : name || timing;
  const line = prefix ? `${prefix}: ${url}` : url;
  const quote = transcript?.replace(/\s+/g, " ").trim();
  return quote ? `${line}\n"${quote}"` : line;
}

export function sheetText(entries: SheetEntry[]) {
  return entries.map(sheetLine).join("\n");
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Google Sheets splits plain-text lines into separate rows when pasting onto a selected cell.
 * A one-cell HTML table with `<br>` keeps everything in that cell.
 */
export function sheetCellHtml(text: string) {
  return `<table><tr><td>${text.split("\n").map(escapeHtml).join("<br>")}</td></tr></table>`;
}
