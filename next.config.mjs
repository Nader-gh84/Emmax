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
    const noStoreHeaders = [
      { key: "Cache-Control", value: "no-store, must-revalidate" },
      // Vercel edge ignores plain Cache-Control: no-store for CDN TTL
      // unless these CDN-specific headers are also set.
      { key: "CDN-Cache-Control", value: "no-store" },
      { key: "Vercel-CDN-Cache-Control", value: "no-store" },
    ];

    return [
      // Explicit rule for public/images/* (direct asset requests)
      {
        source: "/images/:path*",
        headers: noStoreHeaders,
      },
      // Next.js <Image> serves through /_next/image
      {
        source: "/_next/image",
        headers: noStoreHeaders,
      },
      // HTML documents and other non-hashed routes
      {
        source: "/((?!_next/static|favicon.ico).*)",
        headers: noStoreHeaders,
      },
    ];
  },
};

export default nextConfig;
