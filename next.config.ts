import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

/** Thumbnails for the image uploader. Scoped to this project's public store when its token is set at build time. */
function publicImagesPattern(): RemotePattern {
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3];
  return {
    protocol: "https",
    hostname: storeId ? `${storeId.toLowerCase()}.public.blob.vercel-storage.com` : "*.public.blob.vercel-storage.com",
    pathname: "/images/**",
    search: "",
  };
}

const nextConfig: NextConfig = {
  /* ffmpeg.wasm may require COOP/COEP when we wire client-side trim for uploads */
  redirects() {
    return [{ source: "/tools/:slug", destination: "/:slug", permanent: true }];
  },
  images: { remotePatterns: [publicImagesPattern()] },
};

export default nextConfig;
