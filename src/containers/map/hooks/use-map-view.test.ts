import { describe, expect, it } from "vitest";
import { parseCenter, parseZoom, serializeCenter, serializeZoom } from "./use-map-view";

describe("center param", () => {
  it("reads lng,lat and writes it rounded to 5 decimals, about 1 m", () => {
    expect(parseCenter("12.3456789,45.6789123")).toEqual([12.3456789, 45.6789123]);
    expect(serializeCenter([12.3456789, 45.6789123])).toBe("12.34568,45.67891");
  });

  it.each(["200,0", "0,95", "abc", "1", "1,2,3", ""])("rejects %j", (value) => {
    expect(parseCenter(value)).toBeNull();
  });
});

describe("zoom param", () => {
  it("reads a zoom and writes it rounded to 1 decimal", () => {
    expect(parseZoom("3.14")).toBe(3.14);
    expect(serializeZoom(3.14)).toBe("3.1");
  });

  it.each(["30", "-1", "x", ""])("rejects %j", (value) => {
    expect(parseZoom(value)).toBeNull();
  });
});
