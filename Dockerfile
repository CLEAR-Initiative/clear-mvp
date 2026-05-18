# syntax=docker/dockerfile:1.7
# clear-mvp — Next.js 15 app, built with the standalone output for minimal image size.
# Final image is ~150 MB instead of ~1 GB, because standalone bundles only the
# files actually required at runtime (no node_modules, no dev deps).
#
# Install + build are done with bun (matches local dev, ~3-4× faster install than npm).
# Runtime stays on Node.js — the canonical, well-tested runtime for Next.js standalone
# output (`server.js`).

# ─── Stage 1: install dependencies ──────────────────────────────────────────
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# libc6-compat is required by some native bindings (sharp, swc) on Alpine.
RUN apk add --no-cache libc6-compat

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# ─── Stage 2: build ─────────────────────────────────────────────────────────
# Build runs under Node.js, NOT bun. Bun's Node-compat layer trips on Next 15's
# webpack worker pool (worker_threads/child_process patterns), causing the
# build to hang silently after "Creating an optimized production build...".
# Install stays on bun above — node_modules/ is filesystem-level, Node reads it
# fine. Once next-pwa / Next 15 / bun all stabilise, this can move back.
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ── Build args for NEXT_PUBLIC_* values ─────────────────────────────────────
# These are INLINED into the client bundle at build time — they can't be
# overridden at runtime via env_file. To deploy different values per env, the
# CI workflow passes --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=... and tags the
# image per environment (e.g. clear-mvp:dev, clear-mvp:staging).
ARG NEXT_PUBLIC_MAPBOX_TOKEN=""
ENV NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}

# Build the Next.js app. Telemetry off so the build doesn't phone home from CI.
# NODE_OPTIONS raises Node's heap ceiling — Next.js 15 + Mantine + recharts
# can hit the default 1.7 GB cap and silently OOM on large bundles.
#
# PWA is enabled in this image. The workbox precache manifest is trimmed in
# next.config.js (maximumFileSizeToCacheInBytes, buildExcludes,
# aggressiveFrontEndNavCaching=false) so the build fits in a 6 GB container —
# safe for GitHub Actions ubuntu-latest. If memory ever gets tight again, set
# DISABLE_PWA=1 here to skip workbox generation entirely.
#
# API_URL is required by src/server/env.ts in production. The value here is a
# placeholder — runtime gets the real value from /srv/app/clear-mvp.env via
# docker compose env_file. Server env vars in Next.js are NOT inlined into the
# build output (unlike NEXT_PUBLIC_*), so this placeholder never appears in
# the shipped image.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV API_URL=http://placeholder-set-at-runtime
RUN npx next build

# ─── Stage 3: runtime ───────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user — Next.js docs' recommended pattern.
RUN addgroup -g 1001 -S nodejs && \
    adduser  -u 1001 -S nextjs -G nodejs

# `public/` holds static assets and the next-pwa service worker.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# `.next/standalone` is the trimmed server (Next.js standalone output).
# `.next/static` has the hashed CSS/JS bundles — served by the standalone server.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Cheap healthcheck — the / route renders the login redirect, which is enough
# to confirm the server is alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "server.js"]
