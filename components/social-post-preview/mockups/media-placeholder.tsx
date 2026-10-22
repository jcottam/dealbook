import { ImageOff } from "lucide-react";

export function MediaPlaceholder({ label = "Media no longer available" }: { label?: string }) {
  return (
    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
      <ImageOff className="size-8 opacity-60" />
      <p className="px-4 text-center text-xs">{label}</p>
    </div>
  );
}
