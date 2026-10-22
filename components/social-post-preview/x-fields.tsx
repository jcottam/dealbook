import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X_TEXT_MAX } from "@/lib/social-post-preview/limits";
import type { SocialMediaItem, XFields } from "@/lib/social-post-preview/types";
import { inferInstagramPostType } from "@/lib/social-post-preview/infer-type";

type Props = {
  media: SocialMediaItem[];
  value: XFields;
  onChange: (next: XFields) => void;
  instagramCaption: string;
  instagramOn: boolean;
};

const CROPS: { value: XFields["crop"]; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "wide", label: "Wide 16:9" },
  { value: "square", label: "Square 1:1" },
];

export function XFieldsSection({ media, value, onChange, instagramCaption, instagramOn }: Props) {
  const type = inferInstagramPostType(media);
  const showCrop = type === "single_image" && media[0]?.kind === "image";

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-sm font-medium">X</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="x-text">Post text</Label>
          {instagramOn && value.text !== instagramCaption ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, text: instagramCaption })}>
              Copy Instagram caption
            </Button>
          ) : null}
        </div>
        <Textarea
          id="x-text"
          rows={4}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
        />
        <p className="text-right text-xs text-muted-foreground">
          {value.text.length} / {X_TEXT_MAX}
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
    </div>
  );
}
