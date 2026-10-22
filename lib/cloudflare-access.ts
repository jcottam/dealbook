/** Cloudflare Access identity headers on requests that passed Zero Trust. */
const AUTHENTICATED_USER_EMAIL = "cf-access-authenticated-user-email";
const JWT_ASSERTION = "cf-access-jwt-assertion";

export function getCloudflareAccessUserEmail(headers: Headers): string | null {
  const email = headers.get(AUTHENTICATED_USER_EMAIL)?.trim();
  return email || null;
}

/** True when the request includes Cloudflare Access authentication headers. */
export function isCloudflareAccessAuthenticated(headers: Headers): boolean {
  if (getCloudflareAccessUserEmail(headers)) return true;
  const jwt = headers.get(JWT_ASSERTION)?.trim();
  return Boolean(jwt);
}
