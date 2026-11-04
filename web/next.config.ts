import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "pfzmmjurwvbxyhwjubdi.supabase.co" }],
  },
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
