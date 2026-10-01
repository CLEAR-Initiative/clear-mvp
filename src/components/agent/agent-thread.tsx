"use client";

/**
 * One Thread with the CLEAR Agent, rendered from a shared `Chat` so the
 * Agent drawer and the Agent page show the same live Thread. Turns are
 * stored as a Conversation in clear-api by `/api/agent`.
 *
 * It fills its container: the turns scroll, and the input box stays pinned
 * to the bottom. An empty Thread introduces the Agent and suggests questions
 * about what is on screen; neither is ever stored as a turn.
 */

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useChat, type Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { ActionIcon, Alert, Box, Button, Group, Loader, Stack, Text, Textarea } from "@mantine/core";
import { IconAlertTriangle, IconClockPause, IconSend } from "@tabler/icons-react";
import { AgentMessage } from "~/components/agent/agent-message";
import { useOptionalAgent } from "~/components/agent/agent-provider";
import { useShownCurrentView } from "~/components/agent/use-shown-current-view";
import { narrowingFilters, sectionOf, type DisplayedCurrentView } from "~/lib/agent-current-view";

/**
 * The transport surfaces a failed request's body as the error message; turn
 * the route's JSON errors into something to show.
 */
export function describeAgentError(error: Error): {
  code?: string;
  budgetResetsAt?: Date;
  message: string;
} {
  try {
    const body = JSON.parse(error.message) as { error?: unknown; code?: unknown; resetsAt?: unknown };
    const code = typeof body.code === "string" ? body.code : undefined;
    const message = typeof body.error === "string" ? body.error : error.message;
    if (code === "AGENT_BUDGET_EXCEEDED" && typeof body.resetsAt === "string") {
      return { code, budgetResetsAt: new Date(body.resetsAt), message };
    }
    return { code, message };
  } catch {
    /* not JSON: a network or stream error */
  }
  return { message: error.message };
}

/** Error codes from /api/agent with a translated message. */
const ERROR_KEYS: Record<string, "forbiddenThread" | "notConfigured"> = {
  THREAD_FORBIDDEN: "forbiddenThread",
  AGENT_NOT_CONFIGURED: "notConfigured",
};

export interface AgentThreadProps {
  chat: Chat<UIMessage>;
}

export function AgentThread({ chat }: AgentThreadProps) {
  const t = useTranslations("agent.thread");
  const { messages, sendMessage, status, error } = useChat({ chat });

  const [draft, setDraft] = useState("");
  // A stored Thread whose turns are still loading looks empty: sending now
  // would stop its turns ever being shown, so wait.
  const agent = useOptionalAgent();
  const loading = agent?.loading === true && agent.threadId === chat.id;
  // Its turns couldn't be loaded: say so and offer a retry. Sending is held
  // until they load (or the user starts a New thread), for the same reason
  // as while loading: a sent turn would stop the stored ones ever showing.
  const loadFailed = agent?.loadFailed === true && agent.threadId === chat.id && messages.length === 0;
  const busy = loading || loadFailed || status === "submitted" || status === "streaming";

  // Follow the newest turn as it streams, unless the user has scrolled up to read.
  const scroller = useRef<HTMLDivElement>(null);
  const following = useRef(true);

  function send(text: string) {
    if (!text || busy) return;
    following.current = true; // a new turn brings the user back to the bottom
    void sendMessage({ text });
  }
  function sendDraft() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    send(text);
  }

  // Changes whenever the turns grow: text streaming in, or a tool moving on
  // to its result (sources, a navigation notice).
  const streamed = messages
    .map((m) => m.parts.map((p) => (p.type === "text" ? p.text.length : `${p.type}:${(p as { state?: string }).state ?? ""}`)).join())
    .join("|");
  useEffect(() => {
    const el = scroller.current;
    if (el && following.current) el.scrollTop = el.scrollHeight;
  }, [streamed, status]);

  return (
    <Box style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%" }}>
      <Box
        ref={scroller}
        style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
        pb={16}
        onScroll={(e) => {
          const el = e.currentTarget;
          following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
      >
        <Stack gap={16}>
          {loading ? (
            <Group gap={8} data-testid="agent-thread-loading">
              <Loader size={12} />
            </Group>
          ) : loadFailed ? (
            <LoadFailed onRetry={() => agent?.retryLoad()} />
          ) : (
            messages.length === 0 && <EmptyThread onAsk={send} disabled={busy} />
          )}
          {messages.map((message) => (
            <AgentMessage key={message.id} message={message} />
          ))}
          {status === "submitted" && (
            <Group gap={8}>
              <Loader size={12} />
              <Text size="xs" c="dimmed">
                {t("thinking")}
              </Text>
            </Group>
          )}

          {error && <AgentError error={error} />}
        </Stack>
      </Box>

      <Group
        gap={8}
        wrap="nowrap"
        align="flex-end"
        p={8}
        style={{
          flexShrink: 0,
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          background: "var(--color-bg-muted)",
        }}
      >
        <Textarea
          variant="unstyled"
          aria-label={t("inputLabel")}
          placeholder={t("inputPlaceholder")}
          autosize
          minRows={1}
          maxRows={8}
          disabled={loading}
          style={{ flex: 1 }}
          px={8}
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendDraft();
            }
          }}
        />
        <ActionIcon
          size={36}
          radius="xl"
          variant="filled"
          color="var(--color-accent)"
          aria-label={t("send")}
          loading={busy && !loading}
          disabled={busy || !draft.trim()}
          onClick={sendDraft}
        >
          <IconSend size={18} />
        </ActionIcon>
      </Group>
    </Box>
  );
}

/** Which suggested questions fit what is on screen. */
type SuggestionSet = "general" | "event" | "signal" | "crisis" | "map" | "detection";

/** Location filters: the only "area" the Agent is told about on the map (not its viewport). */
const AREA_FILTERS = new Set(["locationId", "country", "region"]);

/**
 * The map and detection sets ask about "this area" or "these filters", so
 * they are only offered once the Current view carries one; otherwise the
 * Agent would be asked about something it was never told.
 */
export function suggestionSetFor(view: DisplayedCurrentView | null): SuggestionSet {
  if (!view) return "general";
  if (view.entity) return view.entity.kind;
  const section = sectionOf(view.route);
  const filters = narrowingFilters(view.filters);
  if (section === "map" && filters.some(([key]) => AREA_FILTERS.has(key))) return "map";
  if (section === "detection" && filters.length > 0) return "detection";
  return "general";
}

const SUGGESTION_KEYS = ["q1", "q2", "q3"] as const;

/**
 * The CLEAR Agent's introduction, with questions it can answer about what is
 * on screen. Only what the Agent is actually told: while no Current view is
 * sent, the suggestions stay general.
 */
function EmptyThread({ onAsk, disabled }: { onAsk: (text: string) => void; disabled: boolean }) {
  const t = useTranslations("agent.thread");
  const suggestionSet = suggestionSetFor(useShownCurrentView());
  return (
    <Stack gap={12}>
      <Text data-testid="agent-intro">{t("intro")}</Text>
      <Stack gap={6} align="flex-start">
        {SUGGESTION_KEYS.map((key) => {
          const question = t(`suggestions.${suggestionSet}.${key}`);
          return (
            <Button
              key={key}
              data-testid="agent-suggestion"
              variant="default"
              radius="xl"
              size="xs"
              disabled={disabled}
              styles={{ label: { whiteSpace: "normal", textAlign: "start" }, root: { height: "auto", minHeight: 30 } }}
              py={6}
              onClick={() => onAsk(question)}
            >
              {question}
            </Button>
          );
        })}
      </Stack>
    </Stack>
  );
}

/** The stored Thread's turns couldn't be loaded. */
function LoadFailed({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("agent.errors");
  return (
    <Alert color="red" icon={<IconAlertTriangle size={16} />} data-testid="agent-thread-load-failed">
      <Stack gap={8} align="flex-start">
        <Text size="sm">{t("loadFailed")}</Text>
        <Button size="xs" variant="light" color="red" onClick={onRetry}>
          {t("retryLoad")}
        </Button>
      </Stack>
    </Alert>
  );
}

function AgentError({ error }: { error: Error }) {
  const t = useTranslations("agent.errors");
  const format = useFormatter();
  const { code, budgetResetsAt } = describeAgentError(error);
  if (budgetResetsAt) {
    return (
      <Alert
        color="yellow"
        icon={<IconClockPause size={16} />}
        title={t("budgetSpent")}
        data-testid="agent-budget-spent"
      >
        {t("budgetResets", { time: format.dateTime(budgetResetsAt, { dateStyle: "medium", timeStyle: "short" }) })}
      </Alert>
    );
  }
  const key = code ? ERROR_KEYS[code] : undefined;
  return (
    <Alert color="red" icon={<IconAlertTriangle size={16} />} data-testid="agent-error">
      {t(key ?? "generic")}
    </Alert>
  );
}
