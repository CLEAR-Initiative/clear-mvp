import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  output: "standalone",
  experimental: {
    // Optimize large icon/component libraries to prevent webpack JSON parse crash
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
  },
};

export default withPWA({
  dest: "public",
  // Cache routes on navigation (lightweight — runtime, not precache).
  cacheOnFrontEndNav: true,
  // Aggressive front-end nav caching used to balloon the precache manifest;
  // disabled for now — runtime caching covers the same use case for less
  // build-time memory.
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  // Disabled in dev (PWA service worker caches aggressively, breaks HMR) and
  // in Docker builds where memory headroom is tight — next-pwa + workbox
  // generation can push peak build RSS past 5 GB and OOM-kill the container.
  // Vercel / non-Docker builds keep PWA enabled.
  disable:
    process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "1",
  workboxOptions: {
    disableDevLogs: true,

    // Memory trimming for the precache manifest. Each file workbox walks gets
    // a SHA-256 + revision held resident; trimming the file list trims peak
    // RSS roughly linearly.
    //
    // 1. Skip large assets entirely — they're better served via runtime caching
    //    when the user actually requests them. Default cap is 2 MB; lowering
    //    to 500 KB removes most images / fonts / source maps from the precache.
    maximumFileSizeToCacheInBytes: 500 * 1024,

    // 2. Exclude file types that don't need to be cached on install.
    //    `exclude` is the workbox GenerateSWPlugin name (note: the original
    //    shadowwalker/next-pwa uses `buildExcludes` — different library).
    //    These regexes are checked against the manifest entry path BEFORE
    //    hash computation, so excluded files never load their content into
    //    memory.
    exclude: [
      /\.map$/,                       // source maps — large, dev-only
      /\.txt$/,                       // text manifests etc.
      /chunks\/pages\/_error/,        // Next.js error pages
      /middleware-manifest\.json$/,   // Next.js internal
      /server\//,                     // server-only chunks — never hit from browser
      /-manifest\.json$/,             // various Next.js manifests
    ],
  },
})(nextConfig);
