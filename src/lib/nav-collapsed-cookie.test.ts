import { describe, expect, it } from "vitest";
import { parseNavCollapsedCookie } from "./nav-collapsed-cookie";

describe("parseNavCollapsedCookie", () => {
  it("treats 1/true as collapsed", () => {
    expect(parseNavCollapsedCookie("1")).toBe(true);
    expect(parseNavCollapsedCookie("true")).toBe(true);
    expect(parseNavCollapsedCookie(encodeURIComponent("1"))).toBe(true);
  });

  it("treats missing/0/false as expanded", () => {
    expect(parseNavCollapsedCookie(undefined)).toBe(false);
    expect(parseNavCollapsedCookie("")).toBe(false);
    expect(parseNavCollapsedCookie("0")).toBe(false);
    expect(parseNavCollapsedCookie("false")).toBe(false);
  });
});
