"use client";

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
  const label = formatUpdatedAt(iso);

  return (
    <time
      dateTime={iso}
      suppressHydrationWarning
      className="text-right text-[11px] leading-none text-muted-foreground tabular-nums"
    >
      {`Updated ${label}`}
    </time>
  );
}
