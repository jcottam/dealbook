const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";

/** Unguessable URL-safe id (≥12 chars). */
export function newPreviewId(byteLength = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
