import { describe, expect, it } from "vitest";
import { getHazardName } from "./disaster-types";

describe("getHazardName", () => {
  it("names a GLIDE code by its most specific label, whatever its case", () => {
    expect(getHazardName("fl")).toBe("Flood");
    expect(getHazardName("FL")).toBe("Flood");
    expect(getHazardName("ec")).toBe("Extratropical Cyclone");
    expect(getHazardName("ba")).toBe("Armed Clash");
  });

  it("shows an unknown code as is, uppercased", () => {
    expect(getHazardName("zz")).toBe("ZZ");
  });
});
