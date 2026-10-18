import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ffmpeg.wasm may require COOP/COEP when we wire client-side trim for uploads */
};

export default nextConfig;
