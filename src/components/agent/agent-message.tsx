"use client";

/**
 * One turn of a Thread. An Answer shows, in order: what the CLEAR Agent is
 * doing (one line per tool it runs), the Answer as Markdown, and the Source
 * documents that Answer cited.
 *
 * Markdown is rendered without raw HTML, and links open in a new tab with no
 * referrer, so nothing a model or a document writes can inject markup. The
 * one exception is a link to an app page in the Agent's link structure
 * (agent-links.ts), which opens in the app with the Thread kept beside it.
 * Images are never loaded: an image URL is fetched with no click, so text
 * injected through a document could make the model leak the conversation
 * into one. They render as their alt text.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";
import { Anchor, Box, Button, Card, Group, Loader, Paper, Spoiler, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconArrowBackUp, IconCheck, IconFileText, IconRoute } from "@tabler/icons-react";
import { useOptionalAgent } from "~/components/agent/agent-provider";
import { agentLink, type AgentLink } from "~/lib/agent-links";
import { isNavigateResult, markAgentDeepLink, type NavigateResult } from "~/lib/agent-navigation";

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

/** Tools with their own activity wording; others are named generically. */
const TOOL_KEYS: Record<string, "nrcFind" | "navigate"> = { nrc_find: "nrcFind", navigate: "navigate" };

const NAV_KINDS = ["event", "signal", "crisis", "map", "detection"] as const;
type NavKind = (typeof NAV_KINDS)[number];

/**
 * An Agent navigation, announced where it happened in the Thread, with Back
 * while it can still be undone.
 */
function NavigationNotice({ toolCallId, result }: { toolCallId: string; result: NavigateResult }) {
  const t = useTranslations("agent.navigation");
  const agent = useOptionalAgent();
  const kind = (NAV_KINDS as readonly string[]).includes(result.target.kind)
    ? (result.target.kind as NavKind)
    : null;
  const canGoBack = agent?.canGoBack(toolCallId) ?? false;
  return (
    <Group gap={8} wrap="nowrap" data-testid="agent-navigation">
      <IconRoute size={14} style={{ flexShrink: 0 }} color="var(--mantine-color-dimmed)" />
      <Text size="sm" style={{ flex: 1, minWidth: 0 }} lineClamp={2}>
        {t("movedTo", { kind: kind ? t(`kinds.${kind}`) : result.target.kind, label: result.content.label })}
      </Text>
      {canGoBack && (
        <Button
          size="compact-xs"
          variant="light"
          leftSection={<IconArrowBackUp size={12} />}
          onClick={() => agent?.goBack(toolCallId)}
        >
          {t("back")}
        </Button>
      )}
    </Group>
  );
}

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
  const t = useTranslations("agent.tools");
  const name = toolName(part)!;
  const tool = part as ToolPart;
  const key = TOOL_KEYS[name];
  const labels = key
    ? { running: t(`${key}Running`), done: t(`${key}Done`), unavailable: t(`${key}Unavailable`) }
    : { running: t("running", { tool: name }), done: t("done", { tool: name }), unavailable: t("unavailable", { tool: name }) };
  // Errors are values: nrc_find returns `{ error: string }`, the clear_*
  // tools and navigate `{ error: { code, message } }`. A navigate result the
  // client refused to act on didn't move anyone either.
  const failed =
    tool.state === "output-error" ||
    (tool.state === "output-available" &&
      (!!(tool.output as { error?: unknown } | undefined)?.error ||
        (name === "navigate" && !isNavigateResult(tool.output))));
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
        {failed ? labels.unavailable : done ? labels.done : labels.running}
      </Text>
    </Group>
  );
}

function Markdown({ text }: { text: string }) {
  const agent = useOptionalAgent();
  const onAppLink = (link: AgentLink) => {
    // Leaving the Agent page: carry the Thread into the drawer, so the Answer
    // stays beside what its link opened (as Agent navigation does).
    if (window.location.pathname === "/agent") agent?.setOpen(true);
    // The Map and Detection apply a filtered link as a fresh move.
    if (link.kind === "filtered") markAgentDeepLink(link.href);
  };
  return (
    <Box className="agent-markdown" style={{ lineHeight: 1.6, overflowWrap: "anywhere" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => {
            const link = agentLink(href);
            return link ? (
              <Anchor component={Link} href={link.href} onClick={() => onAppLink(link)} data-testid="agent-app-link">
                {children}
              </Anchor>
            ) : (
              <Anchor href={href} target="_blank" rel="noopener noreferrer nofollow">
                {children}
              </Anchor>
            );
          },
          img: ({ alt }) => (alt ? <span>{alt}</span> : null),
        }}
      >
        {text}
      </ReactMarkdown>
    </Box>
  );
}

function SourceDocuments({ docs }: { docs: SourceDocument[] }) {
  const t = useTranslations("agent.message");
  return (
    <Stack gap={6} data-testid="agent-sources">
      <Text size="xs" fw={600} c="dimmed">
        {t("sources", { count: docs.length })}
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
            <Spoiler maxHeight={60} showLabel={t("showMore")} hideLabel={t("showLess")}>
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
        <Paper radius="md" px={14} py={10} bg="var(--color-bg-muted)" maw="85%">
          <Text style={{ whiteSpace: "pre-wrap" }}>{text}</Text>
        </Paper>
      </Group>
    );
  }

  const docs = sourceDocumentsOf(message.parts);
  return (
    <Stack gap={8} data-role="assistant">
      {message.parts.map((part, i) => {
        const tool = part as ToolPart;
        if (toolName(part) === "navigate" && tool.state === "output-available" && isNavigateResult(tool.output)) {
          return <NavigationNotice key={i} toolCallId={tool.toolCallId ?? String(i)} result={tool.output} />;
        }
        if (toolName(part)) return <ToolActivity key={i} part={part} />;
        if (part.type === "text" && part.text) return <Markdown key={i} text={part.text} />;
        return null;
      })}
      {docs.length > 0 && <SourceDocuments docs={docs} />}
    </Stack>
  );
}
