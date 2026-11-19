import { describe, expect, it } from "vitest";
import { supportedTimeZones, timeZoneLabel, timeZoneOptions } from "./timezones";

const pinned = [
  { value: "Africa/Khartoum", label: "Sudan (Khartoum)" },
  { value: "UTC", label: "UTC" },
];
const now = new Date("2026-01-15T12:00:00Z");

describe("timeZoneOptions", () => {
  it("lists the pinned zones first, then the other zones", () => {
    const options = timeZoneOptions({
      pinned,
      now,
      zones: ["Africa/Khartoum", "Africa/Nairobi", "Europe/Oslo", "UTC"],
    });
    expect(options.map((o) => o.value)).toEqual(["Africa/Khartoum", "UTC", "Africa/Nairobi", "Europe/Oslo"]);
    expect(options[0]?.label).toBe("Sudan (Khartoum)");
  });

  it("adds the current zone when the runtime does not list it", () => {
    const options = timeZoneOptions({ pinned, now, current: "Asia/Calcutta", zones: ["Europe/Oslo"] });
    expect(options.map((o) => o.value)).toContain("Asia/Calcutta");
  });

  it("falls back to the pinned zones when the runtime lists none", () => {
    expect(timeZoneOptions({ pinned, now, zones: [] })).toEqual(pinned);
  });

  it("offers far more than the two pinned zones on this runtime", () => {
    const values = timeZoneOptions({ pinned, now }).map((o) => o.value);
    expect(supportedTimeZones().length).toBeGreaterThan(100);
    expect(values).toContain("Europe/Oslo");
    expect(values).toContain("Africa/Nairobi");
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("timeZoneLabel", () => {
  it("shows the zone name with spaces and its GMT offset", () => {
    expect(timeZoneLabel("America/Argentina/Buenos_Aires", now)).toBe("America/Argentina/Buenos Aires (GMT-3)");
    expect(timeZoneLabel("Europe/Oslo", now)).toBe("Europe/Oslo (GMT+1)");
  });
});
