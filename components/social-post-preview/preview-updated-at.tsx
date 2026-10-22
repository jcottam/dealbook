"use client";

import { useEffect, useState } from "react";

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

type Props = {
  iso: string;
};

export function PreviewUpdatedAt({ iso }: Props) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatUpdatedAt(iso));
  }, [iso]);

  return (
    <time
      dateTime={iso}
      suppressHydrationWarning
      className="text-right text-[11px] leading-none text-muted-foreground tabular-nums"
    >
      {label ? `Updated ${label}` : "\u00a0"}
    </time>
  );
}
