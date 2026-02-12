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
    // Optimize page data loading
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@radix-ui/react-icons",
      "framer-motion",
    ],
  },

  // Use SWC for faster, more memory-efficient minification
  swcMinify: true,

  // Webpack configuration to ignore OpenTelemetry and optimize memory
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        { module: /node_modules\/@opentelemetry/ },
        { module: /node_modules\/require-in-the-middle/ },
      ];
    }

    // Filesystem cache: tekrarlayan build'lerde büyük hız kazancı
    config.cache = {
      type: "filesystem",
      compression: "gzip",
      maxAge: 604800000, // 7 gün (Docker layer cache ile uyumlu)
    };

    return config;
  },

  // Turkish URL rewrites
  async rewrites() {
    return [
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

  // Redirects removed (Ezoic ads.txt redirect removed)
  async redirects() {
    return [];
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
    // ESLint hataları CI'da kontrol edilir, build'de atla (~30s kazanç)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TS hataları dev'de ve CI'da kontrol edilir, Docker build'de atla (~20s kazanç)
    // Not: Runtime crash riski minimal çünkü dev'de zaten kontrol ediliyor
    ignoreBuildErrors: true,
  },
  // Headers for iOS auto-linking prevention (hydration fix)
  async headers() {
    return [
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
