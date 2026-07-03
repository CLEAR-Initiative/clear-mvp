import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { useEntityNavigation } from "~/hooks/use-entity-navigation";

describe("useEntityNavigation", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("starts with paramsId as activeId", () => {
    const { result } = renderHook(() =>
      useEntityNavigation({ paramsId: "sig-1", routePrefix: "/signal" }),
    );
    expect(result.current.activeId).toBe("sig-1");
  });

  it("navigateTo updates activeId and calls router.replace", () => {
    const { result } = renderHook(() =>
      useEntityNavigation({ paramsId: "sig-1", routePrefix: "/signal" }),
    );

    act(() => {
      result.current.navigateTo("sig-2");
    });

    expect(result.current.activeId).toBe("sig-2");
    expect(replace).toHaveBeenCalledWith("/signal/sig-2", { scroll: false });
  });

  it("syncs activeId when paramsId changes (browser back/forward)", async () => {
    const { result, rerender } = renderHook(
      ({ paramsId }: { paramsId: string }) =>
        useEntityNavigation({ paramsId, routePrefix: "/event" }),
      { initialProps: { paramsId: "ev-1" } },
    );

    act(() => {
      result.current.navigateTo("ev-2");
    });
    expect(result.current.activeId).toBe("ev-2");

    rerender({ paramsId: "ev-2" });
    expect(result.current.activeId).toBe("ev-2");

    rerender({ paramsId: "ev-1" });
    await waitFor(() => {
      expect(result.current.activeId).toBe("ev-1");
    });
  });
});
