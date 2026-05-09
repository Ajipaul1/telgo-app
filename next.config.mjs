/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.maptiler.com"
      },
      {
        protocol: "https",
        hostname: "*.supabase.co"
      }
    ]
  }
};

export default nextConfig;
