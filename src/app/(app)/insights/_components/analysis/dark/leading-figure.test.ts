import { describe, expect, it } from "vitest";
import { leadingFigure } from "./leading-figure";

describe("leadingFigure", () => {
  it("keeps a leading range as one figure and leaves the remaining words as the sentence", () => {
    expect(leadingFigure("8.58 / \u20138.6 million people are displaced")).toEqual({
      figure: "8.58 / \u20138.6 million",
      rest: "people are displaced",
    });
  });

  it("still splits a single leading number from the sentence", () => {
    expect(leadingFigure("8.58 million people are displaced")).toEqual({
      figure: "8.58",
      rest: "million people are displaced",
    });
  });

  it("still splits a suffixed leading number from the sentence", () => {
    expect(leadingFigure("8.58M people are displaced")).toEqual({
      figure: "8.58M",
      rest: "people are displaced",
    });
  });

  it("leaves a bare small number in the sentence", () => {
    expect(leadingFigure("12 people were displaced")).toBeNull();
  });
});
