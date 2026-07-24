import { describe, expect, it } from "vitest";
import { countryConfig } from "~/lib/constants/country-config";

describe("countryConfig", () => {
  it("includes Venezuela with a western-hemisphere bbox (GH #112)", () => {
    const ve = countryConfig.Venezuela;
    expect(ve).toBeDefined();
    expect(ve!.pCode).toBe("VE");
    expect(ve!.center[0]).toBeLessThan(0);
    expect(ve!.bbox[0]).toBeLessThan(0);
    expect(ve!.bbox[2]).toBeLessThan(0);
  });
});
