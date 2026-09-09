import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {},
  images: {
    localPatterns: [
      { pathname: "/api/backend/v1/assets/*", search: "" },
      { pathname: "/icons/robinhood-chain-avatar.jpg", search: "" },
    ],
    remotePatterns: [],
    maximumRedirects: 0,
    qualities: [75],
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    }];
  },
  webpack(config) {
    // Wallet SDKs advertise optional Node/React-Native helpers that are never
    // used by the browser build. Marking them false keeps production builds
    // deterministic without shipping platform-only packages.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules\/ox\//, message: /Critical dependency/ },
    ];
    return config;
  },
};

export default nextConfig;
