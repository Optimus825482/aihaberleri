/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // Required for Docker deployment

  // Stable build ID for Docker layer caching (cache busting via git commit)
  // generateBuildId removed - Next.js default hash is sufficient

  // Exclude heavy server-only packages from client bundling (CRITICAL for memory)
  // This prevents Puppeteer, Firebase Admin etc from being analyzed during build
  experimental: {
    serverComponentsExternalPackages: [
      "puppeteer",
      "puppeteer-core",
      "firebase-admin",
      "@sentry/nextjs",
      "sharp",
      "bullmq",
      "ioredis",
      "pg",
      "googleapis",
      "@prisma/client",
      "winston",
    ],
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Force include sharp and its dependencies in standalone output
    outputFileTracingIncludes: {
      "/": ["./node_modules/sharp/**/*"],
    },
    // Disable instrumentation to prevent OpenTelemetry errors
    instrumentationHook: false,
    // Disable worker threads during build to reduce memory usage
    workerThreads: false,
    // Optimize page data loading
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@radix-ui/react-icons",
      "framer-motion",
    ],
  },

  // Webpack configuration to ignore OpenTelemetry and optimize memory
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        { module: /node_modules\/@opentelemetry/ },
        { module: /node_modules\/require-in-the-middle/ },
      ];
    }

    // Filesystem cache: Docker build'de layer cache yeterli
    // Coolify ortamında filesystem cache gereksiz memory tüketir
    config.cache = false;

    return config;
  },

  // Turkish URL rewrites
  async rewrites() {
    return [
      // IndexNow key verification: /{key}.txt → API route (bypasses Cloudflare cache)
      {
        source: "/:key([0-9a-f]{32}).txt",
        destination: "/api/indexnow-key?key=:key",
      },
      {
        source:
          "/:key([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}).txt",
        destination: "/api/indexnow-key?key=:key",
      },
      // Turkish URL rewrites
      {
        source: "/haberler/:slug",
        destination: "/news/:slug",
      },
      {
        source: "/haberler",
        destination: "/news",
      },
    ];
  },

  async redirects() {
    return [
      // Fix: /news/en/news/{slug} double prefix → /en/news/{slug}
      {
        source: "/news/en/news/:slug*",
        destination: "/en/news/:slug*",
        permanent: true,
      },
      // Fix: /news/en/{slug} wrong format → /en/news/{slug}
      {
        source: "/news/en/:slug*",
        destination: "/en/news/:slug*",
        permanent: true,
      },
      // Legacy: /haber/{slug} → /news/{slug} (eski URL yapısı)
      {
        source: "/haber/:slug*",
        destination: "/news/:slug*",
        permanent: true,
      },
    ];
  },

  images: {
    // All images are pre-optimized webp on R2 — skip Next.js image proxy entirely
    // This eliminates all /_next/image 400 errors
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "image.pollinations.ai",
      },
      {
        protocol: "https",
        hostname: "aihaberleri.org",
      },
      {
        protocol: "https",
        hostname: "images.aihaberleri.org",
      },
      {
        protocol: "https",
        hostname: "pub-32620931b6ce48bca2549881c536b806.r2.dev",
      },
    ],
    // Pollinations.ai images are slow on first gen, cache them longer
    minimumCacheTTL: 86400, // 24 hours
    // Increase timeout for slow Pollinations.ai responses
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  eslint: {
    // ESLint 9 flat config is incompatible with Next.js 14's built-in lint runner.
    // Run lint separately via `npm run lint` or in CI.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type checking during Docker build causes OOM on 2GB build containers.
    // Run `npx tsc --noEmit` separately in CI or locally.
    ignoreBuildErrors: true,
  },
  // Headers for iOS auto-linking prevention (hydration fix)
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "format-detection",
            value: "telephone=no, date=no, email=no, address=no",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
