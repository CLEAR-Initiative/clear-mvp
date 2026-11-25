import { act, renderHook, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { parseDetail, parseStack, usePanelSelection } from "./use-panel-selection";

function renderSelection(searchParams: Record<string, string>) {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const view = renderHook(() => usePanelSelection(), {
    wrapper: ({ children }) => (
      <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
        {children}
      </NuqsTestingAdapter>
    ),
  });
  return { ...view, onUrlUpdate, lastParams: () => onUrlUpdate.mock.calls.at(-1)?.[0].searchParams };
}

describe("selection params", () => {
  it("reads a kind and an id", () => {
    expect(parseDetail("event:abc")).toEqual({ kind: "event", value: "abc" });
  });

  it("reads a kind and a point", () => {
    expect(parseStack("alert:32.5,15.6")).toEqual({ kind: "alert", value: [32.5, 15.6] });
  });

  it.each(["abc", "crisis:abc", "event:", ":abc"])("rejects the detail %j", (raw) => {
    expect(parseDetail(raw)).toBeNull();
  });

  it.each(["32.5,15.6", "event:nowhere", "crisis:32.5,15.6"])("rejects the stack %j", (raw) => {
    expect(parseStack(raw)).toBeNull();
  });
});

describe("usePanelSelection", () => {
  it("reads the detail's kind from the URL", () => {
    const { result } = renderSelection({ detail: "event:e1" });

    expect(result.current.kind).toBe("event");
    expect(result.current.mapSelection).toEqual({ type: "detection", kind: "event", id: "e1" });
  });

  it("tells the map about a stack before a detection opened from it", () => {
    const { result } = renderSelection({ stack: "alert:30,15", detail: "alert:a1" });

    expect(result.current.detailId).toBe("a1");
    expect(result.current.mapSelection).toEqual({ type: "stack", kind: "alert", coordinates: [30, 15] });
  });

  it("ignores a stack of another kind than the detail", () => {
    const { result } = renderSelection({ stack: "signal:30,15", detail: "event:e1" });

    expect(result.current.stack).toBeNull();
    expect(result.current.mapSelection).toEqual({ type: "detection", kind: "event", id: "e1" });
  });

  it("ignores a selection without a known kind", () => {
    const { result } = renderSelection({ detail: "s1" });

    expect(result.current.kind).toBeNull();
    expect(result.current.mapSelection).toBeNull();
  });

  it("writes a selected detection with its kind and drops the stack", async () => {
    const { result, onUrlUpdate, lastParams } = renderSelection({ stack: "signal:30,15" });

    act(() => result.current.selectDetail("event", "e2"));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(lastParams()?.get("detail")).toBe("event:e2");
    expect(lastParams()?.has("stack")).toBe(false);
  });

  it("opens an item of a stack with the stack's kind and keeps the stack", async () => {
    const { result, onUrlUpdate, lastParams } = renderSelection({ stack: "alert:30,15" });

    act(() => result.current.openStackDetail("a2"));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(lastParams()?.get("detail")).toBe("alert:a2");
    expect(lastParams()?.get("stack")).toBe("alert:30,15");
  });
});
