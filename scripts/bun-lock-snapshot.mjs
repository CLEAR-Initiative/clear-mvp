#!/usr/bin/env node
/**
 * Builds a GitHub dependency-submission snapshot from bun.lock.
 *
 * GitHub's dependency graph doesn't parse bun.lock: on its own it only sees
 * the ranges in package.json, so Dependabot alerts would miss every
 * transitive package. The dependency-submission workflow posts this snapshot
 * to /repos/{owner}/{repo}/dependency-graph/snapshots so alerts cover the
 * whole resolved tree.
 *
 * Usage: node scripts/bun-lock-snapshot.mjs [path/to/bun.lock] > snapshot.json
 * Reads SNAPSHOT_SHA / SNAPSHOT_REF (falling back to GITHUB_SHA / GITHUB_REF)
 * and GITHUB_RUN_ID from the environment.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DETECTOR = {
  name: "clear-mvp/bun-lock-snapshot",
  version: "1.0.0",
  url: "https://github.com/CLEAR-Initiative/clear-mvp/blob/dev/scripts/bun-lock-snapshot.mjs",
};

/** bun.lock is JSON with trailing commas. */
export function parseBunLock(text) {
  return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
}

/** Splits a lockfile key like "@scope/a/b/@scope/c" into package names. */
function keySegments(key) {
  const parts = key.split("/");
  const names = [];
  for (let i = 0; i < parts.length; i++) {
    names.push(parts[i].startsWith("@") ? `${parts[i]}/${parts[++i]}` : parts[i]);
  }
  return names;
}

/** "@scope/name@1.2.3" → { name: "@scope/name", version: "1.2.3" } */
function splitSpec(spec) {
  const at = spec.lastIndexOf("@");
  return { name: spec.slice(0, at), version: spec.slice(at + 1) };
}

/** Registry packages only: skips root:, workspace:, link:, file: and git sources. */
function isRegistryVersion(version) {
  return /^\d+\.\d+\.\d+/.test(version);
}

export function packageUrl(name, version) {
  const encodedName = name.startsWith("@") ? `%40${name.slice(1)}` : name;
  return `pkg:npm/${encodedName}@${encodeURIComponent(version)}`;
}

/** Dependency names a package installs: deps, optional deps and required peers. */
function installedDeps(meta = {}) {
  const optionalPeers = new Set(meta.optionalPeers ?? []);
  const peers = Object.keys(meta.peerDependencies ?? {}).filter((d) => !optionalPeers.has(d));
  return [
    ...Object.keys(meta.dependencies ?? {}),
    ...Object.keys(meta.optionalDependencies ?? {}),
    ...peers,
  ];
}

/**
 * Resolves dependency `dep` as seen from lockfile key `fromKey`, the way bun
 * nests them: the closest "<ancestor path>/<dep>" entry wins, then the
 * hoisted "<dep>".
 */
function resolveKey(packages, fromKey, dep) {
  const segments = fromKey ? keySegments(fromKey) : [];
  for (let i = segments.length; i >= 0; i--) {
    const candidate = [...segments.slice(0, i), dep].join("/");
    if (candidate in packages) return candidate;
  }
  return null;
}

/** Returns the `resolved` map for the root workspace of a parsed bun.lock. */
export function resolveDependencies(lock) {
  const { packages } = lock;
  const root = lock.workspaces?.[""] ?? {};
  const runtimeRoots = [
    ...Object.keys(root.dependencies ?? {}),
    ...Object.keys(root.optionalDependencies ?? {}),
    ...Object.keys(root.peerDependencies ?? {}),
  ];
  const devRoots = Object.keys(root.devDependencies ?? {});

  // Walk the tree from the runtime roots first, so anything a runtime
  // dependency pulls in is marked runtime even if dev tooling also uses it.
  const scopeByKey = new Map();
  const walk = (rootNames, scope) => {
    const queue = rootNames.map((name) => resolveKey(packages, "", name)).filter(Boolean);
    while (queue.length) {
      const key = queue.shift();
      if (scopeByKey.has(key)) continue;
      scopeByKey.set(key, scope);
      for (const dep of installedDeps(packages[key][2])) {
        const child = resolveKey(packages, key, dep);
        if (child && !scopeByKey.has(child)) queue.push(child);
      }
    }
  };
  walk(runtimeRoots, "runtime");
  walk(devRoots, "development");

  const directKeys = new Set(
    [...runtimeRoots, ...devRoots].map((name) => resolveKey(packages, "", name)),
  );

  // The same name@version can sit at several lockfile paths; merge them.
  const resolved = {};
  for (const [key, scope] of scopeByKey) {
    const [spec, , meta] = packages[key];
    const { name, version } = splitSpec(spec);
    if (!isRegistryVersion(version)) continue;

    const purl = packageUrl(name, version);
    const entry = (resolved[purl] ??= {
      package_url: purl,
      relationship: "indirect",
      scope: "development",
      dependencies: [],
    });
    if (directKeys.has(key)) entry.relationship = "direct";
    if (scope === "runtime") entry.scope = "runtime";

    for (const dep of installedDeps(meta)) {
      const childKey = resolveKey(packages, key, dep);
      if (!childKey) continue;
      const child = splitSpec(packages[childKey][0]);
      if (!isRegistryVersion(child.version)) continue;
      const childUrl = packageUrl(child.name, child.version);
      if (!entry.dependencies.includes(childUrl)) entry.dependencies.push(childUrl);
    }
  }
  return resolved;
}

export function buildSnapshot(lockText, { sha, ref, runId, scanned, lockPath = "bun.lock" }) {
  return {
    version: 0,
    sha,
    ref,
    job: { correlator: "bun-lock-snapshot", id: String(runId) },
    detector: DETECTOR,
    scanned,
    manifests: {
      [lockPath]: {
        name: lockPath,
        file: { source_location: lockPath },
        resolved: resolveDependencies(parseBunLock(lockText)),
      },
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const lockPath = process.argv[2] ?? "bun.lock";
  const sha = process.env.SNAPSHOT_SHA ?? process.env.GITHUB_SHA;
  const ref = process.env.SNAPSHOT_REF ?? process.env.GITHUB_REF;
  if (!sha || !ref) {
    console.error("bun-lock-snapshot: set SNAPSHOT_SHA and SNAPSHOT_REF (or GITHUB_SHA/GITHUB_REF)");
    process.exit(1);
  }
  const snapshot = buildSnapshot(readFileSync(lockPath, "utf8"), {
    sha,
    ref,
    runId: process.env.GITHUB_RUN_ID ?? "local",
    scanned: new Date().toISOString(),
    lockPath,
  });
  const resolved = Object.values(snapshot.manifests[lockPath].resolved);
  console.error(
    `bun-lock-snapshot: ${resolved.length} packages ` +
      `(${resolved.filter((p) => p.relationship === "direct").length} direct, ` +
      `${resolved.filter((p) => p.scope === "runtime").length} runtime)`,
  );
  process.stdout.write(JSON.stringify(snapshot));
}
