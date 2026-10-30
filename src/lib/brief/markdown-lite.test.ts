import { describe, expect, it } from "vitest";
import { markdownLiteToPlain, parseInline, parseMarkdownLite, safeLinkHref } from "./markdown-lite";

describe("markdown-lite", () => {
  it("splits paragraphs on blank lines and keeps their line breaks, like the email", () => {
    expect(parseMarkdownLite("One\ntwo\n\nThree")).toEqual([
      { type: "paragraph", lines: [[{ text: "One" }], [{ text: "two" }]] },
      { type: "paragraph", lines: [[{ text: "Three" }]] },
    ]);
  });

  it("reads a run of - lines as one list", () => {
    expect(parseMarkdownLite("Intro\n- a\n- **b**\nAfter")).toEqual([
      { type: "paragraph", lines: [[{ text: "Intro" }]] },
      { type: "list", items: [[{ text: "a" }], [{ text: "b", bold: true }]] },
      { type: "paragraph", lines: [[{ text: "After" }]] },
    ]);
  });

  it("reads bold, italic and http(s) links", () => {
    expect(parseInline("**Up** and *down*, see [OCHA](https://ocha.org/x)")).toEqual([
      { text: "Up", bold: true },
      { text: " and " },
      { text: "down", italic: true },
      { text: ", see " },
      { text: "OCHA", href: "https://ocha.org/x" },
    ]);
  });

  it("takes one level of parentheses in a link target", () => {
    expect(parseInline("[war](https://en.wikipedia.org/wiki/War_(disambiguation))")).toEqual([
      { text: "war", href: "https://en.wikipedia.org/wiki/War_(disambiguation)" },
    ]);
  });

  it("keeps only the text of a link that isn't http(s)", () => {
    expect(parseInline("[click](javascript:alert(1))")[0]).toEqual({ text: "click" });
    expect(safeLinkHref("mailto:a@b.c")).toBeNull();
    expect(safeLinkHref("http://x.org")).toBe("http://x.org");
  });

  it("leaves markup characters it doesn't understand as text", () => {
    expect(markdownLiteToPlain("<b>hi</b> # not a heading")).toBe("<b>hi</b> # not a heading");
  });

  it("flattens to plain text with link targets", () => {
    expect(markdownLiteToPlain("**A** [b](https://b.org)\n\n- c")).toBe("A b (https://b.org)\n\n- c");
  });
});
