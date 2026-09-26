import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ffmpeg-installer/ffmpeg resolves its binary path with dynamic
  // require() calls that Turbopack's bundler can't statically follow —
  // keep it (and fluent-ffmpeg) external so Node resolves it at runtime
  // from node_modules instead of trying to bundle it.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "fluent-ffmpeg"],
};

export default nextConfig;
