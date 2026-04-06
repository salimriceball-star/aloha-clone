import type { NextConfig } from "next";

const sourceHostname = new URL(process.env.SOURCE_BASE_URL ?? "https://aloha-yt.xyz").hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: sourceHostname
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      }
    ]
  }
};

export default nextConfig;
