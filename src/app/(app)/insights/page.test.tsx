import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

import InsightsPage from "./page";

describe("Insights route", () => {
  it("sends the retired page to Analysis", () => {
    expect(() => InsightsPage()).toThrow("REDIRECT:/analysis");
    expect(redirect).toHaveBeenCalledWith("/analysis");
  });
});
