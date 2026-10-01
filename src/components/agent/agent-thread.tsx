"use client";

/**
 * One Thread with the CLEAR Agent, rendered from a shared `Chat` so the
 * Agent drawer and the Agent page show the same live Thread. Turns are
 * stored as a Conversation in clear-api by `/api/agent`.
 */

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useChat, type Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Alert, Button, Group, Loader, Stack, Text, Textarea } from "@mantine/core";
import { IconAlertTriangle, IconClockPause, IconSend } from "@tabler/icons-react";
import { AgentMessage } from "~/components/agent/agent-message";

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
  const busy = status === "submitted" || status === "streaming";

  function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    void sendMessage({ text });
  }

  return (
    <Stack gap={16}>
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

      <Textarea
        aria-label={t("inputLabel")}
        placeholder={t("inputPlaceholder")}
        autosize
        minRows={2}
        maxRows={8}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <Group justify="flex-end">
        <Button
          leftSection={busy ? <Loader size={14} color="white" /> : <IconSend size={16} />}
          onClick={send}
          disabled={busy || !draft.trim()}
        >
          {t("send")}
        </Button>
      </Group>
    </Stack>
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
