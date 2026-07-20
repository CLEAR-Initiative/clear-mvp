import { describe, expect, it } from "vitest";
import {
  aggregationModeForZoom,
  donutCenterCount,
  donutCenterLabel,
  donutSeveritySegments,
  DENSITY_DONUT_MAX_ZOOM,
  DENSITY_HEATMAP_MAX_ZOOM,
} from "./marker-density";

describe("aggregationModeForZoom", () => {
  it("is heatmap at and below the cutoff (inclusive)", () => {
    expect(aggregationModeForZoom(0)).toBe("heatmap");
    expect(aggregationModeForZoom(DENSITY_HEATMAP_MAX_ZOOM)).toBe("heatmap");
  });

  it("switches to donuts strictly above the heatmap cutoff (no overlap band)", () => {
    expect(aggregationModeForZoom(DENSITY_HEATMAP_MAX_ZOOM + 0.01)).toBe("donut");
    expect(aggregationModeForZoom(5)).toBe("donut");
    expect(aggregationModeForZoom(DENSITY_DONUT_MAX_ZOOM)).toBe("donut");
  });

  it("uses individual points above the donut band", () => {
    expect(aggregationModeForZoom(DENSITY_DONUT_MAX_ZOOM + 0.01)).toBe("point");
    expect(aggregationModeForZoom(12)).toBe("point");
  });

  it("is mutually exclusive at the heatmap/donut boundary", () => {
    const atCut = aggregationModeForZoom(DENSITY_HEATMAP_MAX_ZOOM);
    const justAbove = aggregationModeForZoom(DENSITY_HEATMAP_MAX_ZOOM + 0.001);
    expect(atCut).toBe("heatmap");
    expect(justAbove).toBe("donut");
    expect(atCut).not.toBe(justAbove);
  });
});

describe("donut center count (active-view semantics)", () => {
  it("reads Mapbox point_count as the clustered item total", () => {
    expect(donutCenterCount({ point_count: 21 })).toBe(21);
    expect(donutCenterLabel({ point_count: 21 })).toBe("21");
  });

  it("treats missing/invalid counts as zero", () => {
    expect(donutCenterCount({})).toBe(0);
    expect(donutCenterCount({ point_count: null })).toBe(0);
    expect(donutCenterLabel({ point_count: undefined })).toBe("0");
  });

  it("caps the visible label at 999+", () => {
    expect(donutCenterLabel({ point_count: 1000 })).toBe("999+");
    expect(donutCenterCount({ point_count: 1000 })).toBe(1000);
  });
});

describe("donutSeveritySegments", () => {
  it("keeps only severities present in the cluster", () => {
    expect(
      donutSeveritySegments({ critical: 2, high: 0, medium: 5, low: 1 }),
    ).toEqual([
      { severity: "critical", count: 2 },
      { severity: "medium", count: 5 },
      { severity: "low", count: 1 },
    ]);
  });
});
