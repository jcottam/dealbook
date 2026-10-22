/**
 * Routes that must stay reachable without Cloudflare Access (reviewer share links).
 * Keep in sync with Zero Trust bypass rules on media-utils.com.
 */
export function isAccessPublicPath(pathname: string): boolean {
  if (pathname === "/favicon.ico" || pathname === "/robots.txt") return true;
  if (pathname.startsWith("/preview/")) return true;
  return /^\/api\/social-post-preview\/[^/]+\/comments$/.test(pathname);
}
