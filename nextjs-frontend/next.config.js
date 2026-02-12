/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API requests to Django backend
  async rewrites() {
    const djangoUrl = process.env.DJANGO_API_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/django/:path*",
        destination: `${djangoUrl}/:path*`,
      },
    ];
  },
  experimental: {
    // Optimize large icon/component libraries to prevent webpack JSON parse crash
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
  },
};

export default nextConfig;
