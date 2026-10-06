import { describe, expect, it } from "vitest";
import { BELL_MAX_ROWS, bellRows, safeActionPath, unreadCount } from "./notifications";
import type { GqlNotificationStatus } from "./types/graphql";

describe("notifications bell helpers", () => {
  const row = (
    id: string,
    overrides: Partial<{ notificationType: string; createdAt: string; status: GqlNotificationStatus }> = {},
  ) => ({
    id,
    notificationType: "task",
    createdAt: "2026-10-06T10:00:00Z",
    status: "PENDING" as GqlNotificationStatus,
    ...overrides,
  });

  it("lists task notifications only, newest first, capped", () => {
    const rows = [
      row("old", { createdAt: "2026-10-01T10:00:00Z" }),
      row("alert", { notificationType: "alert" }),
      row("new", { createdAt: "2026-10-06T10:00:00Z" }),
    ];
    expect(bellRows(rows).map((r) => r.id)).toEqual(["new", "old"]);
    const many = Array.from({ length: BELL_MAX_ROWS + 5 }, (_, i) => row(`n${i}`));
    expect(bellRows(many)).toHaveLength(BELL_MAX_ROWS);
  });

  it("counts everything not yet READ as unread", () => {
    expect(unreadCount([row("a"), row("b", { status: "DELIVERED" }), row("c", { status: "READ" })])).toBe(2);
  });

  it("links only absolute in-app paths", () => {
    expect(safeActionPath("/event/evt-1")).toBe("/event/evt-1");
    expect(safeActionPath(null)).toBeNull();
    expect(safeActionPath("")).toBeNull();
    expect(safeActionPath("//evil.example/x")).toBeNull();
    expect(safeActionPath("https://evil.example/x")).toBeNull();
    expect(safeActionPath("javascript:alert(1)")).toBeNull();
    expect(safeActionPath("event/evt-1")).toBeNull();
  });
});
