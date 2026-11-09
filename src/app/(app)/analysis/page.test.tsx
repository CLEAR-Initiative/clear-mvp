import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

import AnalysisPage from "./page";

describe("Old Analysis route", () => {
  it("sends /analysis to Insights", async () => {
    await expect(AnalysisPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/insights");
    expect(redirect).toHaveBeenCalledWith("/insights");
  });

  it("keeps a country query and renames an analysis id to insights", async () => {
    redirect.mockClear();
    await expect(
      AnalysisPage({ searchParams: Promise.resolve({ country: "sdn", tab: "needs" }) }),
    ).rejects.toThrow("REDIRECT:/insights?country=sdn&tab=needs");

    redirect.mockClear();
    await expect(
      AnalysisPage({ searchParams: Promise.resolve({ analysis: "auto-1" }) }),
    ).rejects.toThrow("REDIRECT:/insights?insights=auto-1");

    redirect.mockClear();
    await expect(
      AnalysisPage({ searchParams: Promise.resolve({ automation: "auto-1" }) }),
    ).rejects.toThrow("REDIRECT:/insights?insights=auto-1");
  });
});
