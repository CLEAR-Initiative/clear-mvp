import { describe, expect, it } from "vitest";
import { ACCESS_TOPICS, AGGRAVATING_TOPICS, groupByTopic } from "./taxonomy-topics";

describe("groupByTopic", () => {
  it("keeps taxonomy order and leaves out topics without findings", () => {
    const groups = groupByTopic(
      [
        { topic: "resource_shortfalls", text: "Underfunded" },
        { topic: "economic_fragility", text: "Currency" },
        { topic: "economic_fragility", text: "Prices" },
      ],
      AGGRAVATING_TOPICS,
    );
    expect(groups.map((g) => [g.topic, g.items.length])).toEqual([
      ["economic_fragility", 2],
      ["resource_shortfalls", 1],
    ]);
  });

  it("puts unknown topics last as other", () => {
    const groups = groupByTopic(
      [
        { topic: "weather", text: "Rain" },
        { topic: "security", text: "Checkpoints" },
      ],
      ACCESS_TOPICS,
    );
    expect(groups.map((g) => g.topic)).toEqual(["security", "other"]);
  });

  it("returns nothing for no findings", () => {
    expect(groupByTopic([], ACCESS_TOPICS)).toEqual([]);
  });
});
