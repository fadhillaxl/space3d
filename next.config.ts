import type { NextConfig } from "next";

const basePath = process.env.BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH ?? "/space-edu-3d";

const nextConfig: NextConfig = {
  basePath: basePath === "" ? undefined : basePath,
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/(_nano|_shuttle|vendor)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/discovery.html", destination: "/discovery", permanent: true },
      { source: "/buran.html", destination: "/buran", permanent: true },
      { source: "/satria-1.html", destination: "/rascube", permanent: true },
      { source: "/satria-1", destination: "/rascube", permanent: true },
      { source: "/cubesat.html", destination: "/kratos", permanent: true },
      { source: "/cubesat", destination: "/kratos", permanent: true },
      { source: "/rascube.html", destination: "/rascube", permanent: true },
      { source: "/kratos.html", destination: "/kratos", permanent: true },
    ];
  },
};

export default nextConfig;
