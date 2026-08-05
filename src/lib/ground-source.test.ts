import { describe, expect, it } from "vitest";
import {
  GROUND_SOURCE_KINDS,
  SENDER_PLACEHOLDER,
  isGroundSourceKind,
  senderDisplay,
} from "./ground-source";

// Sender-identity rendering rules per source kind. Synthetic fixtures only
// — no hotline data exists yet; these tests pin the hotline behavior ahead
// of expo-370 so the first real hotline message renders correctly.

/** Synthetic message fixture (only the fields senderDisplay reads). */
function msg(overrides: { senderName?: string | null; senderRef?: string } = {}) {
  return {
    senderName: "senderName" in overrides ? overrides.senderName ?? null : "Amina H.",
    senderRef: overrides.senderRef ?? "s_ab12cd34",
  };
}

describe("isGroundSourceKind", () => {
  it("accepts the three known kinds", () => {
    for (const kind of GROUND_SOURCE_KINDS) {
      expect(isGroundSourceKind(kind)).toBe(true);
    }
  });

  it("rejects unknown, empty, and missing values", () => {
    expect(isGroundSourceKind("bogus")).toBe(false);
    expect(isGroundSourceKind("")).toBe(false);
    expect(isGroundSourceKind(null)).toBe(false);
    expect(isGroundSourceKind(undefined)).toBe(false);
  });
});

describe("senderDisplay — group sources", () => {
  it("shows the display name with the pseudonymous ref as sub-line", () => {
    expect(senderDisplay(msg(), "staff_group")).toEqual({
      primary: "Amina H.",
      secondary: "s_ab12cd34",
    });
    expect(senderDisplay(msg(), "partner_group")).toEqual({
      primary: "Amina H.",
      secondary: "s_ab12cd34",
    });
  });

  it("falls back to the ref when the name is missing or blank", () => {
    expect(senderDisplay(msg({ senderName: null }), "staff_group").primary).toBe("s_ab12cd34");
    expect(senderDisplay(msg({ senderName: "   " }), "staff_group").primary).toBe("s_ab12cd34");
  });

  it("never renders an empty cell even with no identity at all", () => {
    const display = senderDisplay({ senderName: null, senderRef: "" }, "staff_group");
    expect(display.primary).toBe(SENDER_PLACEHOLDER);
    expect(display.secondary).toBeNull();
  });

  it("treats unknown kinds like groups (backend is authoritative)", () => {
    expect(senderDisplay(msg(), "future_kind").primary).toBe("Amina H.");
    expect(senderDisplay(msg(), undefined).primary).toBe("Amina H.");
  });
});

describe("senderDisplay — hotline sources", () => {
  // Hotline sources carry no sender identity: clear-api stores none.
  // senderRef, when present, is the per-conversation pseudonym.
  const hotlineMsg = { senderName: null, senderRef: "c_77ef01ab" };

  it("shows the per-conversation pseudonym when present", () => {
    expect(senderDisplay(hotlineMsg, "hotline")).toEqual({
      primary: "c_77ef01ab",
      secondary: null,
    });
  });

  it("shows an em dash — never a blank cell — when the pseudonym is absent", () => {
    expect(senderDisplay({ senderName: null, senderRef: "" }, "hotline")).toEqual({
      primary: SENDER_PLACEHOLDER,
      secondary: null,
    });
    expect(senderDisplay({ senderName: null, senderRef: "   " }, "hotline").primary).toBe(
      SENDER_PLACEHOLDER,
    );
  });

  it("never renders a display name, even if one arrives on the wire", () => {
    const display = senderDisplay({ senderName: "Should Not Render", senderRef: "c_77ef01ab" }, "hotline");
    expect(display.primary).toBe("c_77ef01ab");
    expect(display.secondary).toBeNull();
  });
});
