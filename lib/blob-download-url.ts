/** `download=1` on Vercel Blob public URLs makes the browser save the file instead of playing it inline. */
export function blobDownloadUrl(blobUrl: string) {
  const u = new URL(blobUrl);
  u.searchParams.set("download", "1");
  return u.toString();
}
