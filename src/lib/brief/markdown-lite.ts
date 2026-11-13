/**
 * Markdown-lite, the formatting a Brief's summary, closing notes and item
 * notes allow: paragraphs, `- ` bullets, **bold**, *italic* and
 * [text](https://…) links, http and https only. Mirrors clear-api's
 * `briefMarkdownLite` (the email), so the composer preview, the PDF and the
 * clipboard copy show what the email shows: lines within a paragraph keep
 * their breaks, and anything else, HTML included, stays plain text.
 */

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** Only ever http(s). */
  href?: string;
}

export type MarkdownBlock =
  /** One entry per source line; the lines are shown with breaks between them. */
  | { type: "paragraph"; lines: InlineSpan[][] }
  | { type: "list"; items: InlineSpan[][] };

/** The URL when it is http(s), else null. */
export function safeLinkHref(url: string): string | null {
  const trimmed = url.trim();
  return /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : null;
}

const BULLET = /^\s*[-*]\s+/;

/** Blocks: runs of `- ` lines are a list; other lines, split by blank lines, are paragraphs. */
export function parseMarkdownLite(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const endParagraph = () => {
    if (paragraph.length > 0) blocks.push({ type: "paragraph", lines: paragraph.map(parseInline) });
    paragraph = [];
  };
  const endList = () => {
    if (list.length > 0) blocks.push({ type: "list", items: list.map(parseInline) });
    list = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (line === "") {
      endParagraph();
      endList();
    } else if (BULLET.test(raw)) {
      endParagraph();
      list.push(raw.replace(BULLET, "").trim());
    } else {
      endList();
      paragraph.push(line);
    }
  }
  endParagraph();
  endList();
  return blocks;
}

// A link target may hold one level of balanced parentheses (Wikipedia-style URLs).
const INLINE = /\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;

/** Inline spans: links, **bold** and *italic*. A link that isn't http(s) keeps only its text. */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      const href = safeLinkHref(m[2]!);
      spans.push(href ? { text: m[1], href } : { text: m[1] });
    } else if (m[3] !== undefined) {
      spans.push({ text: m[3], bold: true });
    } else if (m[4] !== undefined) {
      spans.push({ text: m[4], italic: true });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans;
}

/** The text without its markup, links as "text (url)". */
export function markdownLiteToPlain(text: string): string {
  return parseMarkdownLite(text)
    .map((block) =>
      block.type === "paragraph"
        ? block.lines.map(spansToPlain).join("\n")
        : block.items.map((item) => `- ${spansToPlain(item)}`).join("\n"),
    )
    .join("\n\n");
}

export function spansToPlain(spans: InlineSpan[]): string {
  return spans.map((s) => (s.href ? `${s.text} (${s.href})` : s.text)).join("");
}
