import { afterEach, describe, expect, it, vi } from "vitest";
import { normaliseTestRecipient, readTestRecipient, writeTestRecipient } from "./test-recipient";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("normaliseTestRecipient", () => {
  it("trims and lower-cases an address", () => {
    expect(normaliseTestRecipient("  Tester@Example.ORG ")).toBe("tester@example.org");
  });

  it.each(["", "   ", "not-an-email", "a@b", "a b@c.org", `${"a".repeat(250)}@b.org`])("rejects %j", (raw) => {
    expect(normaliseTestRecipient(raw)).toBeNull();
  });
});

describe("test recipient storage", () => {
  it("keeps one address per user", () => {
    writeTestRecipient("u1", "one@example.org");
    writeTestRecipient("u2", "two@example.org");
    expect(readTestRecipient("u1")).toBe("one@example.org");
    expect(readTestRecipient("u2")).toBe("two@example.org");
  });

  it("forgets the address for null", () => {
    writeTestRecipient("u1", "one@example.org");
    writeTestRecipient("u1", null);
    expect(readTestRecipient("u1")).toBeNull();
  });

  it("ignores a stored value that isn't an address", () => {
    localStorage.setItem("clear-brief-test-recipient:u1", "<script>x</script>");
    expect(readTestRecipient("u1")).toBeNull();
  });

  it("reads null and reports failure when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readTestRecipient("u1")).toBeNull();
    expect(writeTestRecipient("u1", "one@example.org")).toBe(false);
  });
});
