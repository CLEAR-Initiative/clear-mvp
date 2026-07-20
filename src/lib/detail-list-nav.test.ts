import { describe, expect, it } from "vitest";
import {
  getAdjacentItem,
  getListNavigation,
  isTypingTarget,
} from "~/lib/detail-list-nav";

describe("getListNavigation", () => {
  it("returns empty neighbors for an empty list", () => {
    expect(getListNavigation([], "a")).toEqual({
      prevId: null,
      nextId: null,
      hasPrev: false,
      hasNext: false,
      currentIndex: -1,
      totalCount: 0,
      position: "—",
    });
  });

  it("disables both arrows for a singleton list", () => {
    expect(getListNavigation(["only"], "only")).toEqual({
      prevId: null,
      nextId: null,
      hasPrev: false,
      hasNext: false,
      currentIndex: 0,
      totalCount: 1,
      position: "1 / 1",
    });
  });

  it("resolves prev/next and position in the middle", () => {
    expect(getListNavigation(["a", "b", "c"], "b")).toEqual({
      prevId: "a",
      nextId: "c",
      hasPrev: true,
      hasNext: true,
      currentIndex: 1,
      totalCount: 3,
      position: "2 / 3",
    });
  });

  it("disables prev at the start and next at the end", () => {
    expect(getListNavigation(["a", "b", "c"], "a")).toMatchObject({
      prevId: null,
      nextId: "b",
      hasPrev: false,
      hasNext: true,
    });
    expect(getListNavigation(["a", "b", "c"], "c")).toMatchObject({
      prevId: "b",
      nextId: null,
      hasPrev: true,
      hasNext: false,
    });
  });

  it("treats unknown current id as out of list", () => {
    expect(getListNavigation(["a", "b"], "missing").position).toBe("—");
    expect(getListNavigation(["a", "b"], "missing").hasPrev).toBe(false);
    expect(getListNavigation(["a", "b"], "missing").hasNext).toBe(false);
  });
});

describe("getAdjacentItem", () => {
  const items = [
    { id: 10, title: "A" },
    { id: 20, title: "B" },
    { id: 30, title: "C" },
  ];

  it("returns adjacent items by numeric key", () => {
    const mid = getAdjacentItem(items, 20, (m) => m.id);
    expect(mid.prev?.title).toBe("A");
    expect(mid.next?.title).toBe("C");
    expect(mid.currentIndex).toBe(1);
  });

  it("returns null neighbors at boundaries", () => {
    expect(getAdjacentItem(items, 10, (m) => m.id).prev).toBeNull();
    expect(getAdjacentItem(items, 30, (m) => m.id).next).toBeNull();
  });
});

describe("isTypingTarget", () => {
  it("detects inputs and contenteditable", () => {
    const input = document.createElement("input");
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(div)).toBe(true);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
