import { getCloudflareAccessUserEmail, isCloudflareAccessAuthenticated } from "@/lib/cloudflare-access";

/** Always treated as a media-utils admin (same as roster members). */
export const CORE_MEDIA_UTILS_ADMIN_EMAILS = ["jcottam@gmail.com"] as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Extra admins from `MEDIA_UTILS_ADMIN_EMAILS` (comma-separated), e.g. Lisa's work email. */
export function mediaUtilsAdminEmailsFromEnv(): string[] {
  const raw = process.env.MEDIA_UTILS_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((part) => normalizeEmail(part))
    .filter(Boolean);
}

export function isCoreMediaUtilsAdminEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return CORE_MEDIA_UTILS_ADMIN_EMAILS.some((e) => e === normalized);
}

export function isMediaUtilsAdminEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (isCoreMediaUtilsAdminEmail(normalized)) return true;
  return mediaUtilsAdminEmailsFromEnv().includes(normalized);
}

/**
 * Editors who may use internal tools and see **Edit Preview** on share links.
 * Requires Cloudflare Access on the request. When `MEDIA_UTILS_ADMIN_EMAILS` is unset,
 * any authenticated Access user is treated as an admin (Lisa and the rest of the policy).
 */
export function isMediaUtilsAdmin(headers: Headers): boolean {
  if (!isCloudflareAccessAuthenticated(headers)) return false;

  const email = getCloudflareAccessUserEmail(headers);
  if (!email) return true;

  const roster = mediaUtilsAdminEmailsFromEnv();
  if (roster.length === 0) return true;

  return isMediaUtilsAdminEmail(email);
}
