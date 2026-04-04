import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pdyqkrxolbapxzddqzox.supabase.co",
        pathname: "/storage/v1/object/sign/nihongotaku/**",
      },
    ],
  },
};

export default nextConfig;
