import { describe, expect, it } from "vitest";
import { alertStatus, primaryAlert } from "./event-alert";

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
