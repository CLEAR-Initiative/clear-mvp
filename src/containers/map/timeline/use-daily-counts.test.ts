import { describe, expect, it } from "vitest";
import type { TimelineExtent } from "../timeframe/model";
import { dailyCountsInput } from "./use-daily-counts";

describe("dailyCountsInput", () => {
  const extent: TimelineExtent = {
    startMs: Date.parse("2026-08-29T00:00:00.000Z"),
    from: "2026-08-29T00:00:00.000Z",
    to: "2026-11-26T23:59:59.999Z",
  };

  it("counts the selected level", () => {
    expect(dailyCountsInput("alert", extent, null)).toMatchObject({ entity: "alert", groupBy: "day" });
  });

  it("asks for nothing with no level", () => {
    expect(dailyCountsInput(null, extent, null)).toBeNull();
  });
});
