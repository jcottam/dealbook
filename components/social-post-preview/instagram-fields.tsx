import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IG_CAPTION_MAX } from "@/lib/social-post-preview/limits";
import type { InstagramFields, SocialMediaItem } from "@/lib/social-post-preview/types";
import { inferInstagramPostType } from "@/lib/social-post-preview/infer-type";

type Props = {
  media: SocialMediaItem[];
  value: InstagramFields;
  onChange: (next: InstagramFields) => void;
};

const CROPS: { value: InstagramFields["crop"]; label: string }[] = [
  { value: "1:1", label: "Square 1:1" },
  { value: "4:5", label: "Portrait 4:5" },
  { value: "1.91:1", label: "Landscape 1.91:1" },
];

export function InstagramFieldsSection({ media, value, onChange }: Props) {
  const type = inferInstagramPostType(media);
  const showCrop = type !== "single_video";
  const showCover = type === "single_video";
  const duration = media[0]?.durationSeconds ?? 0;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-sm font-medium">Instagram</p>
      <div className="space-y-2">
        <Label htmlFor="ig-caption">Caption</Label>
        <Textarea
          id="ig-caption"
          rows={5}
          value={value.caption}
          onChange={(e) => onChange({ ...value, caption: e.target.value })}
        />
        <p className="text-right text-xs text-muted-foreground">
          {value.caption.length} / {IG_CAPTION_MAX}
        </p>
      </div>
      {showCrop ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Crop</p>
          <div className="flex flex-wrap gap-2">
            {CROPS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`rounded-md border px-3 py-1.5 text-sm ${value.crop === c.value ? "border-primary bg-primary/10" : ""}`}
                onClick={() => onChange({ ...value, crop: c.value })}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {showCover ? (
        <div className="space-y-2">
          <Label htmlFor="ig-cover">Cover frame (seconds)</Label>
          <input
            id="ig-cover"
            type="range"
            min={0}
            max={Math.max(0, duration - 0.1)}
            step={0.1}
            value={value.coverSeconds ?? 0}
            onChange={(e) => onChange({ ...value, coverSeconds: Number(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">{(value.coverSeconds ?? 0).toFixed(1)}s</p>
        </div>
      ) : null}
    </div>
  );
}
