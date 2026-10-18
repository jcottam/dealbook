/** Seconds from HH:MM:SS or HH:MM:SS:FF (frames ignored for clip UI). */
export function parseTimeToSeconds(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const parts = s.split(":").map((p) => p.trim());
  if (parts.length < 2 || parts.length > 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;

  if (parts.length === 2) {
    const [m, sec] = nums;
    if (m > 59 || sec > 59) return null;
    return m * 60 + sec;
  }
  const [h, m, sec] = nums.length === 3 ? nums : [nums[0], nums[1], nums[2]];
  if (m > 59 || sec > 59) return null;
  return h * 3600 + m * 60 + sec;
}

export function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

export const MAX_CLIP_SECONDS = 120;
