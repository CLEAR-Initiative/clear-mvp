import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  currentViewFor,
  publishCurrentView,
  resetCurrentViews,
  useAgentCurrentView,
} from "~/lib/agent-current-view";

afterEach(() => resetCurrentViews());

describe("Current view registry", () => {
  it("is just the route when nothing is published", () => {
    expect(currentViewFor("/map")).toEqual({ route: "/map" });
  });

  it("uses the newest publisher, and hands back to the page when a drawer closes", () => {
    const unpublishPage = publishCurrentView({ entity: { kind: "crisis", id: "c1" } });
    const unpublishDrawer = publishCurrentView({ entity: { kind: "event", id: "e1" } });
    expect(currentViewFor("/crisis/c1")).toEqual({ route: "/crisis/c1", entity: { kind: "event", id: "e1" } });
    unpublishDrawer();
    expect(currentViewFor("/crisis/c1").entity).toEqual({ kind: "crisis", id: "c1" });
    unpublishPage();
    expect(currentViewFor("/crisis/c1")).toEqual({ route: "/crisis/c1" });
  });

  it("publishes while a component is mounted, and withdraws on unmount", () => {
    const { rerender, unmount } = renderHook(({ id }: { id: string | null }) =>
      useAgentCurrentView(id ? { entity: { kind: "signal", id } } : null),
    { initialProps: { id: null as string | null } });
    expect(currentViewFor("/signal/s1").entity).toBeUndefined();
    rerender({ id: "s1" });
    expect(currentViewFor("/signal/s1").entity).toEqual({ kind: "signal", id: "s1" });
    unmount();
    expect(currentViewFor("/signal/s1").entity).toBeUndefined();
  });
});
