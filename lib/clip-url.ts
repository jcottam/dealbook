const DEFAULT_ALLOWED = ["mimir-edit-web-proxies.s3.us-east-1.amazonaws.com"];

export function allowedClipHosts(): string[] {
  const fromEnv = process.env.CLIP_ALLOWED_HOSTS?.split(",").map((h) => h.trim()).filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_ALLOWED;
}

export function isAllowedClipUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    if (u.protocol !== "https:") return false;
    const hosts = allowedClipHosts();
    return hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export type PresignedMeta = {
  host: string;
  filename: string | null;
  expiresAt: Date | null;
};

export function parsePresignedMeta(urlString: string): PresignedMeta | null {
  try {
    const u = new URL(urlString);
    let filename: string | null = null;
    const disp = u.searchParams.get("response-content-disposition");
    if (disp) {
      const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disp);
      if (m) filename = decodeURIComponent(m[1].replace(/"/g, ""));
    }
    const date = u.searchParams.get("X-Amz-Date");
    const expires = u.searchParams.get("X-Amz-Expires");
    let expiresAt: Date | null = null;
    if (date && expires) {
      const start = new Date(
        date.replace(
          /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
          "$1-$2-$3T$4:$5:$6Z",
        ),
      );
      if (!Number.isNaN(start.getTime())) {
        expiresAt = new Date(start.getTime() + Number(expires) * 1000);
      }
    }
    return { host: u.hostname, filename, expiresAt };
  } catch {
    return null;
  }
}
