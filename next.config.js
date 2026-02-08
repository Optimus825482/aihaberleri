/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // Required for Docker deployment

  // Force new build ID to bust cache on every deployment
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },

  // Exclude heavy server-only packages from client bundling (CRITICAL for memory)
  // This prevents Puppeteer, Firebase Admin etc from being analyzed during build
  serverExternalPackages: [
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

    // Reduce memory usage during build
    config.cache = {
      type: "filesystem",
      compression: "gzip",
      maxAge: 60000, // Reduce cache retention
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
  // Experimental features (consolidated - no duplicates)
  experimental: {
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
  eslint: {
    // Production builds will fail on ESLint errors
    // Run `npm run lint` to check locally before building
    ignoreDuringBuilds: false,
  },
  typescript: {
    // CRITICAL: Type errors cause build failures in production
    // This prevents runtime crashes from type mismatches
    ignoreBuildErrors: false,
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
