import { describe, expect, it } from "vitest";
import { markerId, slotBeforeIds } from "./order";

describe("slotBeforeIds", () => {
  it("puts the first layer under the label anchor and each next layer under the previous layer's marker", () => {
    expect(slotBeforeIds(["a", "b", "c"], "road-label")).toEqual(["road-label", markerId("a"), markerId("b")]);
  });
});
