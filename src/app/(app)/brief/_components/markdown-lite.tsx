"use client";

import { Box } from "@mantine/core";
import { parseMarkdownLite, type InlineSpan } from "~/lib/brief/markdown-lite";

/**
 * A Brief's summary, closing notes or item note as the reader sees it, from
 * the same Markdown-lite parse as the PDF and the clipboard copy: anything
 * that isn't **bold**, *italic*, a `- ` bullet or an http(s) link stays plain
 * text, HTML included.
 */
export function MarkdownLite({ text, size = 14 }: { text: string; size?: number }) {
  return (
    <Box style={{ fontSize: size, lineHeight: 1.55, color: "var(--color-text-primary)", overflowWrap: "anywhere" }}>
      {parseMarkdownLite(text).map((block, i) =>
        block.type === "paragraph" ? (
          <p key={i} style={{ margin: "0 0 8px" }}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <Spans spans={line} />
              </span>
            ))}
          </p>
        ) : (
          <ul key={i} style={{ margin: "0 0 8px", paddingInlineStart: 20, listStyleType: "disc" }}>
            {block.items.map((item, j) => (
              <li key={j}>
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </Box>
  );
}

function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, i) => {
        let node: React.ReactNode = span.text;
        if (span.bold) node = <strong>{node}</strong>;
        if (span.italic) node = <em>{node}</em>;
        if (span.href) {
          node = (
            <a href={span.href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-info)" }}>
              {node}
            </a>
          );
        }
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}
