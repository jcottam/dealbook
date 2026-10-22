import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

/** Public Blob store (images, clips, preview assets). Scoped when BLOB_READ_WRITE_TOKEN is set at build time. */
function publicBlobPattern(pathname: string): RemotePattern {
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3];
  return {
    protocol: "https",
    hostname: storeId ? `${storeId.toLowerCase()}.public.blob.vercel-storage.com` : "*.public.blob.vercel-storage.com",
    pathname,
    search: "",
  };
}

const nextConfig: NextConfig = {
  /* ffmpeg.wasm may require COOP/COEP when we wire client-side trim for uploads */
  redirects() {
    return [{ source: "/tools/:slug", destination: "/:slug", permanent: true }];
  },
  images: {
    remotePatterns: [publicBlobPattern("/images/**"), publicBlobPattern("/clips/**"), publicBlobPattern("/previews/**")],
  },
};

export default nextConfig;
