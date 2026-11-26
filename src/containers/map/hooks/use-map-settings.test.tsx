import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";

import { useMapSettings } from "./use-map-settings";

function renderWithSearch(searchParams: Record<string, string>) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={searchParams}>{children}</NuqsTestingAdapter>
  );
  return renderHook(() => useMapSettings(), { wrapper });
}

describe("useMapSettings", () => {
  it("reads districts from the URL", () => {
    expect(renderWithSearch({ boundaries: "districts" }).result.current[0].boundaries).toBe("districts");
  });

  it("falls back to state for a missing or invalid value", () => {
    expect(renderWithSearch({}).result.current[0].boundaries).toBe("state");
    expect(renderWithSearch({ boundaries: "provinces" }).result.current[0].boundaries).toBe("state");
  });
});
