import { describe, expect, it } from "vitest";
import { sortUsersStable } from "./users-order";

describe("sortUsersStable", () => {
  it("keeps a role-updated user in the same name-sorted slot", () => {
    const before = sortUsersStable([
      { id: "3", name: "Zara", role: "viewer" },
      { id: "1", name: "Alex", role: "admin" },
      { id: "2", name: "Mira", role: "viewer" },
    ]);
    const afterHeapShuffle = [
      { id: "1", name: "Alex", role: "admin" },
      { id: "3", name: "Zara", role: "viewer" },
      { id: "2", name: "Mira", role: "analyst" },
    ];

    expect(sortUsersStable(afterHeapShuffle).map((u) => u.id)).toEqual(
      before.map((u) => u.id),
    );
    expect(sortUsersStable(afterHeapShuffle)[1]).toMatchObject({
      id: "2",
      role: "analyst",
    });
  });

  it("ties on id so equal names stay deterministic", () => {
    const users = [
      { id: "b", name: "Sam" },
      { id: "a", name: "Sam" },
    ];
    expect(sortUsersStable(users).map((u) => u.id)).toEqual(["a", "b"]);
  });
});
