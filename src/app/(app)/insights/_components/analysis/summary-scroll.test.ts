import { describe, expect, it } from "vitest";
import { summaryCollapseAnchor, summaryScrollDelta } from "./summary-scroll";

describe("summary collapse scroll", () => {
  it("leaves a summary that is already on screen where it is", () => {
    const anchor = summaryCollapseAnchor(120);
    expect(anchor).toBe(120);
    expect(summaryScrollDelta(120, anchor)).toBe(0);
  });

  it("scrolls back to the summary when it had been scrolled above the viewport", () => {
    const anchor = summaryCollapseAnchor(-2400);
    expect(anchor).toBe(0);
    expect(summaryScrollDelta(-2400, anchor)).toBe(-2400);
  });
});
