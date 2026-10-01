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
import { IconAlertTriangle, IconSend } from "@tabler/icons-react";
import { AgentMessage } from "~/components/agent/agent-message";

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

      {error && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          {error.message}
        </Alert>
      )}

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
