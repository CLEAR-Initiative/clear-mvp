import { describe, expect, it } from "vitest";
import { deriveEntityPending } from "~/hooks/use-entity-navigation";

describe("deriveEntityPending", () => {
  it("returns false when no entity is resolved yet", () => {
    expect(deriveEntityPending("sig-1", undefined)).toBe(false);
    expect(deriveEntityPending("sig-1", null)).toBe(false);
  });

  it("returns false when activeId matches resolved entity", () => {
    expect(deriveEntityPending("sig-1", { id: "sig-1" })).toBe(false);
  });

  it("returns true when activeId differs from resolved entity", () => {
    expect(deriveEntityPending("sig-2", { id: "sig-1" })).toBe(true);
  });
});
