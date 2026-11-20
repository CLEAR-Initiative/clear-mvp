import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLoadingLayerIds } from "./use-loading-layer-ids";

describe("useLoadingLayerIds", () => {
  it("keeps the same array when a report has the same layer ids", () => {
    const { result } = renderHook(() => useLoadingLayerIds());
    act(() => result.current[1](["signals"]));
    const first = result.current[0];

    act(() => result.current[1](["signals"]));

    expect(result.current[0]).toBe(first);
  });
});
