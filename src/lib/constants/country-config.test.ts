import { describe, expect, it } from "vitest";
import {
  countryConfig,
  resolveCountryConfig,
  staticCountryBounds,
} from "~/lib/constants/country-config";

describe("countryConfig", () => {
  it("includes Venezuela with a western-hemisphere bbox (GH #112)", () => {
    const ve = countryConfig.Venezuela;
    expect(ve).toBeDefined();
    expect(ve!.pCode).toBe("VE");
    expect(ve!.center[0]).toBeLessThan(0);
    expect(ve!.bbox[0]).toBeLessThan(0);
    expect(ve!.bbox[2]).toBeLessThan(0);
  });

  it("resolves COD/UN Venezuela name to static config (instant fly)", () => {
    const official = "Venezuela (Bolivarian Republic of)";
    expect(resolveCountryConfig(official)?.pCode).toBe("VE");
    expect(staticCountryBounds(official)?.[0]).toBeLessThan(0);
    // Longest-prefix wins: South Sudan must not resolve as Sudan.
    expect(resolveCountryConfig("South Sudan")?.pCode).toBe("SS");
    expect(staticCountryBounds(undefined)).toBeNull();
    expect(staticCountryBounds("Not A Country")).toBeNull();
  });
});
