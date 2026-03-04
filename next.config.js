/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Optimize large icon/component libraries to prevent webpack JSON parse crash
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
  },
};

export default nextConfig;
