"use client";

/**
 * One turn of a Thread. An Answer shows, in order: what the CLEAR Agent is
 * doing (one line per tool it runs), the Answer as Markdown, and the Source
 * documents that Answer cited.
 *
 * Markdown is rendered without raw HTML, and links open in a new tab with no
 * referrer, so nothing a model or a document writes can inject markup.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";
import { Anchor, Box, Card, Group, Loader, Paper, Spoiler, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconFileText } from "@tabler/icons-react";

type Part = UIMessage["parts"][number];

interface SourceDocument {
  title: string;
  fileName?: string | null;
  sourceId: string | null;
  content: string;
}

interface ToolPart {
  type: string;
  toolCallId?: string;
  state?: string;
  output?: unknown;
  errorText?: string;
}

const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  nrc_find: { running: "Searching NRC documents…", done: "Searched NRC documents" },
};

function toolName(part: Part): string | null {
  return part.type.startsWith("tool-") ? part.type.slice("tool-".length) : null;
}

/** The Source documents a tool result carries, if it is one that cites. */
export function sourceDocumentsOf(parts: readonly Part[]): SourceDocument[] {
  const seen = new Set<string>();
  const docs: SourceDocument[] = [];
  for (const part of parts) {
    const tool = part as ToolPart;
    if (!toolName(part) || tool.state !== "output-available") continue;
    const output = tool.output as { sourceDocuments?: unknown } | undefined;
    if (!Array.isArray(output?.sourceDocuments)) continue;
    for (const doc of output.sourceDocuments as SourceDocument[]) {
      // NRC Find's source ids name a collection, not a document, so the
      // same document is recognised by its name and passage.
      const key = `${doc.fileName ?? doc.title}|${doc.content.slice(0, 200)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      docs.push(doc);
    }
  }
  return docs;
}

function ToolActivity({ part }: { part: Part }) {
  const name = toolName(part)!;
  const tool = part as ToolPart;
  const labels = TOOL_LABELS[name] ?? { running: `Running ${name}…`, done: `Ran ${name}` };
  const failed =
    tool.state === "output-error" ||
    (tool.state === "output-available" &&
      typeof (tool.output as { error?: unknown } | undefined)?.error === "string");
  const done = tool.state === "output-available" || tool.state === "output-error";

  return (
    <Group gap={6} data-testid="agent-tool-activity" data-tool={name} data-state={tool.state}>
      {failed ? (
        <IconAlertTriangle size={14} color="var(--mantine-color-orange-6)" />
      ) : done ? (
        <IconCheck size={14} color="var(--mantine-color-dimmed)" />
      ) : (
        <Loader size={12} />
      )}
      <Text size="xs" c="dimmed">
        {failed ? `${labels.done} — unavailable` : done ? labels.done : labels.running}
      </Text>
    </Group>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <Box className="agent-markdown" style={{ lineHeight: 1.6, overflowWrap: "anywhere" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <Anchor href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </Anchor>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </Box>
  );
}

function SourceDocuments({ docs }: { docs: SourceDocument[] }) {
  return (
    <Stack gap={6} data-testid="agent-sources">
      <Text size="xs" fw={600} c="dimmed">
        Sources ({docs.length})
      </Text>
      {docs.map((doc, i) => (
        <Card key={i} withBorder radius="sm" p={10}>
          <Group gap={6} mb={4} wrap="nowrap">
            <IconFileText size={14} style={{ flexShrink: 0 }} />
            <Text size="sm" fw={600} lineClamp={1}>
              {doc.title}
            </Text>
          </Group>
          {doc.fileName && doc.fileName !== doc.title && (
            <Text size="xs" c="dimmed" mb={4} lineClamp={1}>
              {doc.fileName}
            </Text>
          )}
          {doc.content && (
            <Spoiler maxHeight={60} showLabel="Show more" hideLabel="Show less">
              <Text size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                {doc.content}
              </Text>
            </Spoiler>
          )}
        </Card>
      ))}
    </Stack>
  );
}

export function AgentMessage({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    const text = message.parts
      .filter((p): p is Extract<Part, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    return (
      <Group justify="flex-end" data-role="user">
        <Paper radius="md" px={14} py={10} bg="var(--mantine-color-gray-1)" maw="85%">
          <Text style={{ whiteSpace: "pre-wrap" }}>{text}</Text>
        </Paper>
      </Group>
    );
  }

  const docs = sourceDocumentsOf(message.parts);
  return (
    <Stack gap={8} data-role="assistant">
      {message.parts.map((part, i) => {
        if (toolName(part)) return <ToolActivity key={i} part={part} />;
        if (part.type === "text" && part.text) return <Markdown key={i} text={part.text} />;
        return null;
      })}
      {docs.length > 0 && <SourceDocuments docs={docs} />}
    </Stack>
  );
}
