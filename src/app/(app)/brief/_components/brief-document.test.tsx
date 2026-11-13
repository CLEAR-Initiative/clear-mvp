import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { toBriefView } from "~/lib/brief/view";
import { LABELS, brief, item } from "~/lib/brief/test-fixtures";
import { BriefDocument, type BriefDocumentLabels } from "./brief-document";

const labels: BriefDocumentLabels = {
  eyebrow: "Daily Brief",
  org: "Norwegian Refugee Council · CLEAR",
  classification: "Internal use and private sharing only",
  summary: "Summary",
  counts: "Counts",
  items: "Picked items",
  closingNotes: "Closing notes",
  none: "—",
  types: "Types",
  sources: "Sources",
  more: (n) => `+${n} more`,
  footer: "CLEAR · Daily Brief, Sudan",
  generated: "PDF created 30 Oct 2026 in CLEAR (Draft).",
  page: (n, total) => `Page ${n} of ${total}`,
};

describe("BriefDocument", () => {
  it("renders every section, Markdown-lite and a note to a PDF", async () => {
    const view = toBriefView(
      brief({
        summary: "**Calm** day.\n- See [OCHA](https://ocha.org)\n- <b>not html</b>",
        closingNotes: "Next Brief tomorrow, El Fāshir included.",
        counts: {
          alert: { total: 2, bySeverity: [{ key: "5", count: 2 }], byType: [{ key: "fl", count: 2 }] },
          event: { total: 0, bySeverity: [], byType: [] },
          signal: { total: 3, bySeverity: [{ key: "(unknown)", count: 3 }], byType: [{ key: "Dataminr", count: 3 }] },
        },
        items: [
          item({ id: "a1", kind: "alert", position: 0, note: "Watch **Tawila**" }),
          item({ id: "s1", kind: "signal", position: 0, snapshot: { occurredAt: "2026-10-01T00:00:00.000Z" } as never }),
        ],
      }),
      LABELS,
    );
    const buf = await renderToBuffer(<BriefDocument view={view} labels={labels} />);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);

  it("runs over several pages without the fixed footer growing", async () => {
    const note = "Fighting, displacement and disease continue across North Darfur. ".repeat(6);
    const items = Array.from({ length: 40 }, (_, i) => item({ id: `e${i}`, kind: "event", position: i, note }));
    const buf = await renderToBuffer(<BriefDocument view={toBriefView(brief({ items }), LABELS)} labels={labels} />);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.toString("latin1").match(/\/Type \/Page\b/g)!.length).toBeGreaterThan(2);
  }, 30_000);
});
