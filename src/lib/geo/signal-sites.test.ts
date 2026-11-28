import { describe, expect, it } from "vitest";
import { siteMarkers } from "./signal-sites";
import type { GqlSignalSite } from "~/lib/types/graphql";

const site = (name: string | null, locName: string, coords?: [number, number]): GqlSignalSite => ({
  name,
  kind: "NAMED_SITE",
  location: {
    id: locName,
    name: locName,
    level: 4,
    geometry: coords ? { type: "Point", coordinates: coords } : null,
  },
});

describe("siteMarkers", () => {
  it("gives one marker per site with a point, named as the text names it", () => {
    const markers = siteMarkers([site("Dumayyah camp", "Dumayah", [24.9, 12.05])], 1);
    expect(markers).toEqual([
      expect.objectContaining({ id: 1, lng: 24.9, lat: 12.05, title: "Dumayyah camp", description: "Dumayah" }),
    ]);
  });

  it("falls back to the location name when the text gives none", () => {
    expect(siteMarkers([site(null, "Nyala Airport", [24.95, 12.06])], 0)[0]!.title).toBe("Nyala Airport");
  });

  it("skips sites with no point and sites on a marker already shown", () => {
    const markers = siteMarkers(
      [site("A", "A", undefined), site("B", "B", [24.88, 12.05]), site("C", "C", [25, 13]), site("C2", "C2", [25, 13])],
      5,
      [{ lng: 24.88, lat: 12.05 }],
    );
    expect(markers.map((m) => [m.id, m.title])).toEqual([[5, "C"]]);
  });

  it("returns nothing for a signal with no other sites", () => {
    expect(siteMarkers(undefined, 0)).toEqual([]);
    expect(siteMarkers([], 0)).toEqual([]);
  });
});
