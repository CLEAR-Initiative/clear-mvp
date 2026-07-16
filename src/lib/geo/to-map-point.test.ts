import { describe, it, expect } from "vitest";
import { toMapPointGeometry, sanitizeLocationGeometry } from "./to-map-point";

describe("toMapPointGeometry", () => {
  it("passes through Point geometries unchanged", () => {
    const point = {
      type: "Point" as const,
      coordinates: [33.5, 12.5] as [number, number],
    };
    
    const result = toMapPointGeometry(point);
    
    expect(result).toEqual({
      type: "Point",
      coordinates: [33.5, 12.5],
    });
  });

  it("converts Polygon to centroid Point", () => {
    const polygon = {
      type: "Polygon" as const,
      coordinates: [
        [
          [30.0, 10.0],
          [40.0, 10.0],
          [40.0, 20.0],
          [30.0, 20.0],
          [30.0, 10.0], // closing point
        ],
      ],
    };
    
    const result = toMapPointGeometry(polygon);
    
    expect(result).toEqual({
      type: "Point",
      coordinates: [34.0, 14.0], // centroid including closing point
    });
  });

  it("converts MultiPolygon to centroid Point", () => {
    const multiPolygon = {
      type: "MultiPolygon" as const,
      coordinates: [
        [
          [
            [30.0, 10.0],
            [40.0, 10.0],
            [30.0, 10.0],
          ],
        ],
        [
          [
            [50.0, 20.0],
            [60.0, 20.0],
            [50.0, 20.0],
          ],
        ],
      ],
    };
    
    const result = toMapPointGeometry(multiPolygon);
    
    expect(result).not.toBeNull();
    expect(result?.type).toBe("Point");
    expect(result?.coordinates).toHaveLength(2);
    expect(typeof result?.coordinates[0]).toBe("number");
    expect(typeof result?.coordinates[1]).toBe("number");
  });

  it("returns null for null/undefined input", () => {
    expect(toMapPointGeometry(null)).toBeNull();
    expect(toMapPointGeometry(undefined)).toBeNull();
  });

  it("returns null for invalid Point coordinates", () => {
    const invalid = {
      type: "Point" as const,
      coordinates: [NaN, 12.5] as [number, number],
    };
    
    expect(toMapPointGeometry(invalid)).toBeNull();
  });

  it("returns null for empty Polygon", () => {
    const empty = {
      type: "Polygon" as const,
      coordinates: [],
    };
    
    expect(toMapPointGeometry(empty)).toBeNull();
  });

  it("returns null for unsupported geometry types", () => {
    const lineString = {
      type: "LineString",
      coordinates: [[30.0, 10.0], [40.0, 20.0]],
    };
    
    expect(toMapPointGeometry(lineString as never)).toBeNull();
  });
});

describe("sanitizeLocationGeometry", () => {
  it("replaces Polygon geometry with centroid Point", () => {
    const location = {
      id: "loc-1",
      name: "Test Location",
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [30.0, 10.0],
            [40.0, 10.0],
            [40.0, 20.0],
            [30.0, 20.0],
            [30.0, 10.0],
          ],
        ],
      },
    };
    
    const result = sanitizeLocationGeometry(location);
    
    expect(result?.geometry).toEqual({
      type: "Point",
      coordinates: [34.0, 14.0],
    });
  });

  it("keeps Point geometry unchanged", () => {
    const location = {
      id: "loc-2",
      name: "Point Location",
      geometry: {
        type: "Point" as const,
        coordinates: [33.5, 12.5] as [number, number],
      },
    };
    
    const result = sanitizeLocationGeometry(location);
    
    expect(result?.geometry).toEqual({
      type: "Point",
      coordinates: [33.5, 12.5],
    });
  });

  it("removes invalid geometry", () => {
    const location = {
      id: "loc-3",
      name: "Invalid Location",
      geometry: {
        type: "Invalid",
        coordinates: null,
      },
    };
    
    const result = sanitizeLocationGeometry(location);
    
    expect(result?.geometry).toBeUndefined();
  });

  it("returns null for null input", () => {
    expect(sanitizeLocationGeometry(null)).toBeNull();
    expect(sanitizeLocationGeometry(undefined)).toBeNull();
  });
});
