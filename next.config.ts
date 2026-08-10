import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Static HTML/JS/CSS under public/ are not HMR'd. In dev, disable caching
    // so a normal reload always picks up the latest saved files.
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/:path*.html",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
