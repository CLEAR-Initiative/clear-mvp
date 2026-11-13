import { parseMarkdownLite, spansToPlain, type InlineSpan } from "./markdown-lite";
import type { BriefView, CountRow, ViewItem } from "./view";

/**
 * A Brief on the clipboard as rich text (HTML) with a plain-text twin, from
 * `toBriefView`, so it pastes with the same sections and items as the
 * composer, the PDF and the email. Every string is escaped: titles, notes
 * and place names come from people and the pipeline.
 */

export interface BriefTextLabels {
  summary: string;
  counts: string;
  items: string;
  closingNotes: string;
  /** Shown for an empty section or group. */
  none: string;
  types: string;
  sources: string;
  more: (count: number) => string;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function spansHtml(spans: InlineSpan[]): string {
  return spans
    .map((span) => {
      let html = escapeHtml(span.text);
      if (span.bold) html = `<strong>${html}</strong>`;
      if (span.italic) html = `<em>${html}</em>`;
      // parseInline only ever yields http(s) hrefs.
      if (span.href) html = `<a href="${escapeHtml(span.href)}">${html}</a>`;
      return html;
    })
    .join("");
}

function markdownHtml(text: string, none?: string): string {
  const blocks = parseMarkdownLite(text);
  if (blocks.length === 0) return none ? `<p>${escapeHtml(none)}</p>` : "";
  return blocks
    .map((block) =>
      block.type === "paragraph"
        ? `<p>${block.lines.map(spansHtml).join("<br>")}</p>`
        : `<ul>${block.items.map((item) => `<li>${spansHtml(item)}</li>`).join("")}</ul>`,
    )
    .join("");
}

function markdownPlain(text: string, none?: string): string {
  const blocks = parseMarkdownLite(text);
  if (blocks.length === 0) return none ?? "";
  return blocks
    .map((block) =>
      block.type === "paragraph"
        ? block.lines.map(spansToPlain).join("\n")
        : block.items.map((item) => `- ${spansToPlain(item)}`).join("\n"),
    )
    .join("\n\n");
}

function countDetail(row: CountRow, labels: BriefTextLabels): { severity: string; types: string | null } {
  const severity = row.bySeverity.map((b) => `${b.label} ${b.count}`).join(", ") || labels.none;
  if (row.byType.length === 0) return { severity, types: null };
  const list = row.byType.map((b) => `${b.label} ${b.count}`).join(", ") + (row.moreTypes > 0 ? `, ${labels.more(row.moreTypes)}` : "");
  return { severity, types: `${row.kind === "signal" ? labels.sources : labels.types}: ${list}` };
}

function itemMeta(item: ViewItem): string {
  return [item.severityLabel, item.locationName, item.types.join(", ") || null, item.occurredLabel, item.earlier]
    .filter(Boolean)
    .join(" · ");
}

export function briefToHtml(view: BriefView, labels: BriefTextLabels): string {
  const html: string[] = [
    `<h1>${escapeHtml(view.title)}</h1>`,
    `<p><em>${escapeHtml(view.areaName)} · ${escapeHtml(view.windowLabel)}</em></p>`,
    `<h2>1. ${escapeHtml(labels.summary)}</h2>`,
    markdownHtml(view.summary, labels.none),
    `<h2>2. ${escapeHtml(labels.counts)}</h2>`,
    `<table><tbody>${view.counts
      .map((row) => {
        const { severity, types } = countDetail(row, labels);
        return `<tr><td><strong>${escapeHtml(row.label)}</strong></td><td><strong>${row.total}</strong></td><td>${escapeHtml(severity)}${
          types ? `<br>${escapeHtml(types)}` : ""
        }</td></tr>`;
      })
      .join("")}</tbody></table>`,
    `<h2>3. ${escapeHtml(labels.items)}</h2>`,
  ];
  for (const group of view.groups) {
    html.push(`<h3>${escapeHtml(group.label)} (${group.items.length})</h3>`);
    if (group.items.length === 0) {
      html.push(`<p>${escapeHtml(labels.none)}</p>`);
      continue;
    }
    html.push(
      `<ul>${group.items
        .map((item) => {
          const title = item.url.startsWith("http")
            ? `<a href="${escapeHtml(item.url)}"><strong>${escapeHtml(item.title)}</strong></a>`
            : `<strong>${escapeHtml(item.title)}</strong>`;
          return `<li>${title}<br><em>${escapeHtml(itemMeta(item))}</em>${item.note ? markdownHtml(item.note) : ""}</li>`;
        })
        .join("")}</ul>`,
    );
  }
  html.push(`<h2>4. ${escapeHtml(labels.closingNotes)}</h2>`, markdownHtml(view.closingNotes, labels.none));
  return html.join("\n");
}

export function briefToPlain(view: BriefView, labels: BriefTextLabels): string {
  const out: string[] = [
    view.title,
    `${view.areaName} · ${view.windowLabel}`,
    `1. ${labels.summary}\n${markdownPlain(view.summary, labels.none)}`,
    `2. ${labels.counts}\n${view.counts
      .map((row) => {
        const { severity, types } = countDetail(row, labels);
        return `${row.label}: ${row.total} (${severity})${types ? `\n  ${types}` : ""}`;
      })
      .join("\n")}`,
  ];
  const groups = view.groups.map((group) => {
    const lines = group.items.map((item) =>
      [`- ${item.title}`, `  ${itemMeta(item)}`, item.note ? indent(markdownPlain(item.note)) : null, item.url ? `  ${item.url}` : null]
        .filter(Boolean)
        .join("\n"),
    );
    return `${group.label} (${group.items.length})\n${lines.length > 0 ? lines.join("\n") : labels.none}`;
  });
  out.push(`3. ${labels.items}\n${groups.join("\n\n")}`);
  out.push(`4. ${labels.closingNotes}\n${markdownPlain(view.closingNotes, labels.none)}`);
  return out.join("\n\n");
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

/**
 * Puts the Brief on the clipboard as rich text with a plain-text fallback.
 * Browsers without ClipboardItem (or that refuse it) get the plain text.
 */
export async function copyBrief(view: BriefView, labels: BriefTextLabels): Promise<"rich" | "plain"> {
  const html = briefToHtml(view, labels);
  const plain = briefToPlain(view, labels);
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return "rich";
    } catch {
      // Fall through to plain text.
    }
  }
  await navigator.clipboard.writeText(plain);
  return "plain";
}
