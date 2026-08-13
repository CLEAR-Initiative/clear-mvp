import { describe, expect, it } from "vitest";
import {
  filterChipStyle,
  resolveInclusionChipVisual,
  toggleInclusionFilter,
} from "~/lib/history-filter-chips";

describe("resolveInclusionChipVisual", () => {
  it("shows all chips off when unconstrained (null)", () => {
    expect(resolveInclusionChipVisual(null, "alert")).toBe("off");
    expect(resolveInclusionChipVisual(null, "Conflict")).toBe("off");
  });

  it("uses selected/off when the dimension is narrowed", () => {
    const active = new Set(["alert", "Conflict"]);
    expect(resolveInclusionChipVisual(active, "alert")).toBe("selected");
    expect(resolveInclusionChipVisual(active, "signal")).toBe("off");
    expect(resolveInclusionChipVisual(active, "Conflict")).toBe("selected");
    expect(resolveInclusionChipVisual(active, "Flood")).toBe("off");
  });
});

describe("toggleInclusionFilter", () => {
  it("selects only the clicked value from an unconstrained state", () => {
    expect(toggleInclusionFilter(null, "alert")).toEqual(new Set(["alert"]));
    expect(toggleInclusionFilter(null, "Conflict")).toEqual(new Set(["Conflict"]));
  });

  it("adds another value without clearing the first", () => {
    expect(toggleInclusionFilter(new Set(["alert"]), "event")).toEqual(
      new Set(["alert", "event"]),
    );
  });

  it("deselects on second click and returns null when empty", () => {
    expect(toggleInclusionFilter(new Set(["alert"]), "alert")).toBeNull();
  });

  it("collapses to null when the full universe is selected", () => {
    const all = ["alert", "event", "signal"] as const;
    expect(
      toggleInclusionFilter(new Set(["alert", "event"]), "signal", all),
    ).toBeNull();
  });
});

describe("filterChipStyle", () => {
  it("gives selected chips an accent fill distinct from off", () => {
    const selected = filterChipStyle("selected");
    const off = filterChipStyle("off");

    expect(selected.background).toBe("var(--color-accent)");
    expect(selected.color).toBe("#fff");
    expect(off.background).toBe("transparent");
    expect(String(off.border)).toContain("dashed");
    expect(selected.background).not.toBe(off.background);
  });
});
