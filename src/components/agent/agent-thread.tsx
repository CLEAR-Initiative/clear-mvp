"use client";

/**
 * One Thread with the CLEAR Agent, rendered from a shared `Chat` so the
 * Agent drawer and the Agent page show the same live Thread. Turns are
 * stored as a Conversation in clear-api by `/api/agent`.
 */

import { useState } from "react";
import { useChat, type Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Alert, Button, Group, Loader, Stack, Text, Textarea } from "@mantine/core";
import { IconAlertTriangle, IconClockPause, IconSend } from "@tabler/icons-react";
import { AgentMessage } from "~/components/agent/agent-message";

/**
 * The transport surfaces a failed request's body as the error message; turn
 * the route's JSON errors into something to show.
 */
export function describeAgentError(error: Error): { budgetResetsAt?: Date; message: string } {
  try {
    const body = JSON.parse(error.message) as { error?: unknown; code?: unknown; resetsAt?: unknown };
    if (body.code === "AGENT_BUDGET_EXCEEDED" && typeof body.resetsAt === "string") {
      return { budgetResetsAt: new Date(body.resetsAt), message: "Your daily Agent budget is spent." };
    }
    if (typeof body.error === "string") return { message: body.error };
  } catch {
    /* not JSON: a network or stream error */
  }
  return { message: error.message || "Something went wrong." };
}

export interface AgentThreadProps {
  chat: Chat<UIMessage>;
}

export function AgentThread({ chat }: AgentThreadProps) {
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
            Thinking…
          </Text>
        </Group>
      )}

      {error && <AgentError error={error} />}

      <Textarea
        aria-label="Message the CLEAR Agent"
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
          Send
        </Button>
      </Group>
    </Stack>
  );
}

function AgentError({ error }: { error: Error }) {
  const { budgetResetsAt, message } = describeAgentError(error);
  if (budgetResetsAt) {
    return (
      <Alert color="yellow" icon={<IconClockPause size={16} />} title={message} data-testid="agent-budget-spent">
        It resets at{" "}
        {budgetResetsAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.
      </Alert>
    );
  }
  return (
    <Alert color="red" icon={<IconAlertTriangle size={16} />}>
      {message}
    </Alert>
  );
}
