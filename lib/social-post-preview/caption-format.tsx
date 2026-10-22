import type { ReactNode } from "react";

const TOKEN_RE = /(@[\w]+|#[\w]+(?:\.[\w]+)*)/gu;

export function splitCaptionTokens(text: string): { type: "text" | "link"; value: string }[] {
  const parts: { type: "text" | "link"; value: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ type: "text", value: text.slice(last, idx) });
    parts.push({ type: "link", value: m[0] });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts.length ? parts : [{ type: "text", value: text }];
}

type FormattedCaptionProps = {
  text: string;
  className?: string;
  linkClassName?: string;
};

export function FormattedCaption({ text, className, linkClassName = "text-sky-600" }: FormattedCaptionProps) {
  const nodes: ReactNode[] = splitCaptionTokens(text).map((part, i) =>
    part.type === "link" ? (
      <span key={i} className={linkClassName}>
        {part.value}
      </span>
    ) : (
      <span key={i}>{part.value}</span>
    ),
  );
  return <span className={className}>{nodes}</span>;
}
