import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Youtube-Transcript",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
