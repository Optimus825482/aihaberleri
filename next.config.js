/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // Required for Docker deployment

  // Force new build ID to bust cache on every deployment
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },

  // Webpack configuration to ignore OpenTelemetry
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        { module: /node_modules\/@opentelemetry/ },
        { module: /node_modules\/require-in-the-middle/ },
      ];
    }
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
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
