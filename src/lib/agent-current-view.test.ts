import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  currentViewFor,
  detectionFiltersForAgent,
  mapFiltersForAgent,
  publishCurrentView,
  resetCurrentViews,
  useAgentCurrentView,
} from "~/lib/agent-current-view";

afterEach(() => resetCurrentViews());

describe("Current view registry", () => {
  it("is just the route when nothing is published", () => {
    expect(currentViewFor("/map")).toEqual({ route: "/map" });
  });

  it("carries the active team when there is one", () => {
    expect(currentViewFor("/event/e1", "team-1")).toEqual({ route: "/event/e1", teamId: "team-1" });
    expect(currentViewFor("/event/e1", null)).toEqual({ route: "/event/e1" });
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

describe("filters from the pages' nav contexts", () => {
  it("maps the Map's scope, keeping null (all time) and dropping unset fields", () => {
    expect(
      mapFiltersForAgent({
        teamId: null,
        locationId: "loc-sdn",
        country: "Sudan",
        region: undefined,
        from: null,
        to: null,
      }),
    ).toEqual({ teamId: null, locationId: "loc-sdn", country: "Sudan", from: null, to: null });
  });

  it("maps Detection's scope and caps long lists", () => {
    const filters = detectionFiltersForAgent({
      teamId: "team-1",
      locationId: "loc-sdn",
      country: "Sudan",
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-10-01T00:00:00.000Z",
      severityMin: 3,
      eventTypes: Array.from({ length: 80 }, (_, i) => `T${i}`),
      orderBy: "SEVERITY_DESC",
      signalOrderBy: "PUBLISHED_DESC",
    });
    expect(filters).toMatchObject({
      teamId: "team-1",
      locationId: "loc-sdn",
      severityMin: 3,
      orderBy: "SEVERITY_DESC",
    });
    expect(filters.eventTypes).toHaveLength(50);
    expect(filters).not.toHaveProperty("severityMax");
    expect(filters).not.toHaveProperty("signalOrderBy");
  });

  it("reports a preview drawer's entity within the page's filters", () => {
    publishCurrentView({ filters: { country: "Sudan" } });
    publishCurrentView({ entity: { kind: "event", id: "e1" } });
    expect(currentViewFor("/detection")).toEqual({
      route: "/detection",
      entity: { kind: "event", id: "e1" },
      filters: { country: "Sudan" },
    });
  });
});
