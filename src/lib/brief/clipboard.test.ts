import { afterEach, describe, expect, it, vi } from "vitest";
import { briefToHtml, briefToPlain, copyBrief, type BriefTextLabels } from "./clipboard";
import { toBriefView } from "./view";
import { LABELS, brief, item } from "./test-fixtures";

const TEXT: BriefTextLabels = {
  summary: "Summary",
  counts: "Counts",
  items: "Picked items",
  closingNotes: "Closing notes",
  none: "—",
  types: "Types",
  sources: "Sources",
  more: (n) => `+${n} more`,
};

const view = toBriefView(
  brief({
    title: `Daily <Brief> & "Sudan"`,
    summary: "**Calm** day <img src=x onerror=alert(1)>\n- [ok](https://ocha.org) and [bad](javascript:alert(1))",
    closingNotes: "",
    items: [
      item({ id: "a1", kind: "alert", position: 0, note: "<script>alert('x')</script> **watch**" }),
      item({ id: "s1", kind: "signal", position: 0, snapshot: { title: "<b>Signal</b>", occurredAt: "2026-10-01T00:00:00.000Z" } as never }),
    ],
  }),
  LABELS,
);

describe("briefToHtml", () => {
  const html = briefToHtml(view, TEXT);

  it("escapes HTML in the title, summary, notes and item titles", () => {
    expect(html).toContain("Daily &lt;Brief&gt; &amp; &quot;Sudan&quot;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; <strong>watch</strong>");
    expect(html).toContain("&lt;b&gt;Signal&lt;/b&gt;");
    expect(html).not.toMatch(/<(script|img|b)\b/);
  });

  it("keeps http(s) links and drops every other kind", () => {
    expect(html).toContain('<a href="https://ocha.org">ok</a>');
    expect(html).not.toContain("javascript:");
    expect(html).toContain("bad");
  });

  it("has the four sections and the three groups in order, empty ones marked", () => {
    const order = ["1. Summary", "2. Counts", "3. Picked items", "Alerts (1)", "Events (0)", "Signals (1)", "4. Closing notes"].map((s) =>
      html.indexOf(s),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain("<h3>Events (0)</h3>\n<p>—</p>");
  });

  it("marks an item from before the window", () => {
    expect(html).toContain("from 2026-10-01");
  });
});

describe("briefToPlain", () => {
  it("has the same sections and items without markup, links spelled out", () => {
    const plain = briefToPlain(view, TEXT);
    expect(plain).toContain("1. Summary\nCalm day <img src=x onerror=alert(1)>\n\n- ok (https://ocha.org) and bad");
    expect(plain).toContain("- <b>Signal</b>");
    expect(plain).toContain("4. Closing notes\n—");
    expect(plain).not.toContain("**");
  });
});

describe("copyBrief", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("writes rich text with a plain-text twin", async () => {
    const write = vi.fn(async () => {});
    vi.stubGlobal("ClipboardItem", class {
      constructor(readonly items: Record<string, Blob>) {}
    });
    vi.stubGlobal("navigator", { clipboard: { write, writeText: vi.fn() } });
    expect(await copyBrief(view, TEXT)).toBe("rich");
    const [[[clip]]] = write.mock.calls as unknown as [[[{ items: Record<string, Blob> }]]];
    expect(Object.keys(clip.items)).toEqual(["text/html", "text/plain"]);
  });

  it("falls back to plain text when rich text isn't available", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("ClipboardItem", undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await copyBrief(view, TEXT)).toBe("plain");
    expect(writeText).toHaveBeenCalledWith(briefToPlain(view, TEXT));
  });
});
