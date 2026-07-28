/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA:
      process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE:
      process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "",
  },
  // Prevent Next.js Image Optimization from CDN-caching /images/*
  // across deployments (default TTL can keep stale optimized variants).
  images: {
    minimumCacheTTL: 0,
  },
  async headers() {
    return [
      // Explicit rule for public/images/* (direct asset requests)
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Vercel-CDN-Cache-Control", value: "no-store" },
        ],
      },
      // Next.js <Image> serves through /_next/image — was previously
      // excluded from no-store, which left logo/hero stuck on CDN.
      {
        source: "/_next/image",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Vercel-CDN-Cache-Control", value: "no-store" },
        ],
      },
      // HTML documents and other non-hashed routes
      {
        source: "/((?!_next/static|_next/image|favicon.ico|images/).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
