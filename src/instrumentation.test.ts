import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Next.js loads the server instrumentation hook only from the directory that
// holds `app` (here: src/). At the repo root it is skipped without a warning,
// which left the server with no error reporting from June to November 2026.
describe("instrumentation hook location", () => {
  const root = path.resolve(__dirname, "..");

  it("lives in src/, next to the app directory", () => {
    expect(existsSync(path.join(root, "src", "app"))).toBe(true);
    expect(existsSync(path.join(root, "src", "instrumentation.ts"))).toBe(true);
  });

  it("has no copy at the repo root", () => {
    expect(existsSync(path.join(root, "instrumentation.ts"))).toBe(false);
  });
});
