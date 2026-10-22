import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Platform } from "@/lib/social-post-preview/types";

type Props = {
  platforms: Platform[];
  onChange: (platforms: Platform[]) => void;
};

export function PlatformToggles({ platforms, onChange }: Props) {
  const ig = platforms.includes("instagram");
  const x = platforms.includes("x");

  const set = (p: Platform, on: boolean) => {
    const next = new Set(platforms);
    if (on) next.add(p);
    else next.delete(p);
    onChange([...next]);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Platforms</p>
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Checkbox id="platform-ig" checked={ig} onCheckedChange={(v) => set("instagram", v === true)} />
          <Label htmlFor="platform-ig">Instagram</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="platform-x" checked={x} onCheckedChange={(v) => set("x", v === true)} />
          <Label htmlFor="platform-x">X</Label>
        </div>
      </div>
    </div>
  );
}
