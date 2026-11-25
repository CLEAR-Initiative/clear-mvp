import { describe, expect, it } from "vitest";
import {
  alertStatus,
  alertsForEvent,
  primaryAlert,
  rememberPromotedAlert,
  type PromotedAlerts,
} from "./event-alert";

describe("primaryAlert", () => {
  it("returns null when the event has no alerts", () => {
    expect(primaryAlert([])).toBeNull();
    expect(primaryAlert(undefined)).toBeNull();
  });

  it("prefers a published alert over draft and archived ones", () => {
    const picked = primaryAlert([
      { id: "a", status: "archived", createdAt: "2026-11-20T00:00:00Z" },
      { id: "p", status: "published", createdAt: "2026-11-01T00:00:00Z" },
      { id: "d", status: "draft", createdAt: "2026-11-21T00:00:00Z" },
    ]);
    expect(picked?.id).toBe("p");
  });

  it("takes the newest alert among the same status", () => {
    const picked = primaryAlert([
      { id: "old", status: "archived", createdAt: "2026-11-01T00:00:00Z" },
      { id: "new", status: "archived", createdAt: "2026-11-10T00:00:00Z" },
    ]);
    expect(picked?.id).toBe("new");
  });

  it("still picks an alert when no createdAt is known", () => {
    expect(primaryAlert([{ id: "x", status: "published" }])?.id).toBe("x");
  });
});

describe("alertStatus", () => {
  it("accepts the three statuses and rejects anything else", () => {
    expect(alertStatus("published")).toBe("published");
    expect(alertStatus("draft")).toBe("draft");
    expect(alertStatus("archived")).toBe("archived");
    expect(alertStatus("pending")).toBeNull();
  });
});

describe("promoted alerts across prev/next navigation", () => {
  it("keeps event A's alert after promoting B and returning to A", () => {
    let promoted: PromotedAlerts = {};
    // Promote A, move to B, promote B. Both cached queries still have no alerts.
    promoted = rememberPromotedAlert(promoted, "A", { id: "alert-a", status: "published" });
    promoted = rememberPromotedAlert(promoted, "B", { id: "alert-b", status: "published" });

    expect(primaryAlert(alertsForEvent("A", [], promoted))?.id).toBe("alert-a");
    expect(primaryAlert(alertsForEvent("B", [], promoted))?.id).toBe("alert-b");
  });

  it("does not show another event's promotion", () => {
    const promoted = rememberPromotedAlert({}, "A", { id: "alert-a", status: "published" });
    expect(primaryAlert(alertsForEvent("C", [], promoted))).toBeNull();
  });

  it("does not duplicate an alert once the refetched event includes it", () => {
    const promoted = rememberPromotedAlert({}, "A", { id: "alert-a", status: "published" });
    const fetched = [{ id: "alert-a", status: "published", createdAt: "2026-11-25T10:00:00Z" }];
    expect(alertsForEvent("A", fetched, promoted)).toHaveLength(1);
  });
});
