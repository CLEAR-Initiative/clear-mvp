import { describe, expect, it } from "vitest";

import { boundaryRequest } from "./model";

const global = { kind: "global" } as const;

describe("boundaryRequest", () => {
  it("sends nothing for global monitoring", () => {
    expect(boundaryRequest("state", { scopeReady: true, countries: [] }, global)).toBeNull();
  });

  it("sends nothing before the scope is ready", () => {
    expect(boundaryRequest("state", { scopeReady: false, countries: [{ id: "sd" }] }, global)).toBeNull();
  });
});
