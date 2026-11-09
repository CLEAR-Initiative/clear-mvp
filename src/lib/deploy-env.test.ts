import { afterEach, describe, expect, it, vi } from "vitest";
import { isDevToolingAllowed } from "./deploy-env";

describe("isDevToolingAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows next dev regardless of deploy env", () => {
    expect(isDevToolingAllowed({ nodeEnv: "development" })).toBe(true);
    expect(isDevToolingAllowed({ nodeEnv: "development", deployEnv: "prod" })).toBe(true);
  });

  it("allows the dev deploy image (NODE_ENV is production)", () => {
    expect(isDevToolingAllowed({ nodeEnv: "production", deployEnv: "dev" })).toBe(true);
  });

  it("never allows prod, hand-built or e2e images", () => {
    expect(isDevToolingAllowed({ nodeEnv: "production", deployEnv: "prod" })).toBe(false);
    expect(isDevToolingAllowed({ nodeEnv: "production", deployEnv: "development" })).toBe(false);
    expect(isDevToolingAllowed({ nodeEnv: "production" })).toBe(false);
  });

  it("reads NODE_ENV and NEXT_PUBLIC_SENTRY_ENV by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_ENV", "dev");
    expect(isDevToolingAllowed()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_SENTRY_ENV", "prod");
    expect(isDevToolingAllowed()).toBe(false);
  });
});
