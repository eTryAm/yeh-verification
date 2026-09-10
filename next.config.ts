import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Set root to the project directory to avoid package-lock.json outside Git repo warning
    root: __dirname,
  },

  // Subdomain verification redirect (activate when credentials.youthempowerment.in is ready)
  // async redirects() {
  //   return [
  //     {
  //       source: '/verify/:id',
  //       destination: 'https://credentials.youthempowerment.in/v/:id',
  //       permanent: false,
  //     },
  //   ]
  // },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Transpile necessary packages
  transpilePackages: [],

  // Experimental features
  experimental: {},
};

export default nextConfig;
