// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildSnapshot, packageUrl, parseBunLock, resolveDependencies } from "./bun-lock-snapshot.mjs";

// Trailing commas on purpose: bun writes them.
const LOCK = `{
  "lockfileVersion": 1,
  "workspaces": {
    "": {
      "name": "app",
      "dependencies": { "a": "^1.0.0", "app": "." },
      "devDependencies": { "d": "^1.0.0" },
    },
  },
  "packages": {
    "a": ["a@1.0.0", "", { "dependencies": { "b": "^1.0.0", "c": "^2.0.0" }, "optionalDependencies": { "@s/e": "^1.0.0" }, "peerDependencies": { "p": "*" }, "optionalPeers": ["p"] }, "sha512-a"],
    "app": ["app@root:", {}],
    "b": ["b@1.0.0", "", {}, "sha512-b1"],
    "c": ["c@1.0.0", "", {}, "sha512-c1"],
    "d": ["d@1.0.0", "", { "dependencies": { "b": "^1.0.0", "c": "^1.0.0" } }, "sha512-d"],
    "@s/e": ["@s/e@1.0.0", "", { "dependencies": { "b": "^2.0.0" } }, "sha512-e"],
    "a/c": ["c@2.0.0", "", {}, "sha512-c2"],
    "@s/e/b": ["b@2.0.0", "", {}, "sha512-b2"],
  },
}`;

describe("bun-lock-snapshot", () => {
  const resolved = resolveDependencies(parseBunLock(LOCK));

  it("encodes scoped names in package URLs", () => {
    expect(packageUrl("@s/e", "1.0.0")).toBe("pkg:npm/%40s/e@1.0.0");
  });

  it("resolves nested entries before hoisted ones, including under scoped parents", () => {
    expect(resolved["pkg:npm/a@1.0.0"].dependencies).toEqual([
      "pkg:npm/b@1.0.0",
      "pkg:npm/c@2.0.0",
      "pkg:npm/%40s/e@1.0.0",
    ]);
    expect(resolved["pkg:npm/%40s/e@1.0.0"].dependencies).toEqual(["pkg:npm/b@2.0.0"]);
  });

  it("marks direct dependencies and scopes by reachability from runtime roots", () => {
    const summary = Object.fromEntries(
      Object.values(resolved).map((p) => [p.package_url, `${p.relationship}/${p.scope}`]),
    );
    expect(summary).toEqual({
      "pkg:npm/a@1.0.0": "direct/runtime",
      "pkg:npm/b@1.0.0": "indirect/runtime",
      "pkg:npm/c@2.0.0": "indirect/runtime",
      "pkg:npm/%40s/e@1.0.0": "indirect/runtime",
      "pkg:npm/b@2.0.0": "indirect/runtime",
      "pkg:npm/d@1.0.0": "direct/development",
      "pkg:npm/c@1.0.0": "indirect/development",
    });
  });

  it("skips the root self-link and optional peers that aren't in the lockfile", () => {
    expect(Object.keys(resolved).some((url) => url.includes("/app@") || url.includes("/p@"))).toBe(false);
  });

  it("wraps the tree in a dependency-submission snapshot", () => {
    const snapshot = buildSnapshot(LOCK, { sha: "abc", ref: "refs/heads/dev", runId: 7, scanned: "now" });
    expect(snapshot).toMatchObject({
      version: 0,
      sha: "abc",
      ref: "refs/heads/dev",
      job: { correlator: "bun-lock-snapshot", id: "7" },
      manifests: { "bun.lock": { file: { source_location: "bun.lock" } } },
    });
    expect(Object.keys(snapshot.manifests["bun.lock"].resolved)).toHaveLength(7);
  });
});
