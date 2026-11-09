import { describe, expect, it } from "vitest";
import { modelChangeWeeks } from "./agent-metrics";

describe("modelChangeWeeks", () => {
  it("marks a week whose models differ from the last week that had turns", () => {
    const weekly = [
      { isoWeek: "2026-W40", models: ["anthropic/claude-sonnet-5-5"] },
      { isoWeek: "2026-W41", models: ["anthropic/claude-sonnet-5-5"] },
      { isoWeek: "2026-W42", models: [] }, // a quiet week is skipped, not a change
      { isoWeek: "2026-W43", models: ["anthropic/claude-sonnet-5-5"] },
      { isoWeek: "2026-W44", models: ["anthropic/claude-haiku-5-5"] },
      { isoWeek: "2026-W45", models: ["anthropic/claude-haiku-5-5", "anthropic/claude-sonnet-5-5"] },
    ];
    expect([...modelChangeWeeks(weekly)]).toEqual(["2026-W44", "2026-W45"]);
  });

  it("never marks the first active week, and nothing with no turns at all", () => {
    expect(modelChangeWeeks([{ isoWeek: "2026-W40", models: [] }, { isoWeek: "2026-W41", models: ["m"] }]).size).toBe(0);
    expect(modelChangeWeeks([]).size).toBe(0);
  });
});
