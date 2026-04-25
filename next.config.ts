import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@remotion/bundler',
    '@remotion/renderer',
    'esbuild',
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pdyqkrxolbapxzddqzox.supabase.co",
        pathname: "/storage/v1/object/sign/nihongotaku/**",
      },
      {
        protocol: "https",
        hostname: "pdyqkrxolbapxzddqzox.supabase.co",
        pathname: "/storage/v1/object/public/nihongotaku/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default nextConfig;
