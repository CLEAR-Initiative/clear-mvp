"use client";

/**
 * One Thread with the CLEAR Agent. Streams turns from `/api/agent`, which
 * stores them as a Conversation in clear-api, so only the newest message is
 * sent: the Agent loads the earlier turns itself.
 */

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Alert, Box, Button, Group, Loader, Stack, Text, Textarea } from "@mantine/core";
import { IconAlertTriangle, IconSend } from "@tabler/icons-react";

export interface AgentThreadProps {
  threadId: string;
  /** Turns already stored for this Thread, oldest first. */
  initialMessages?: UIMessage[];
}

export function AgentThread({ threadId, initialMessages }: AgentThreadProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/agent",
        prepareSendMessagesRequest: ({ messages, id }) => ({
          body: { threadId: id, message: messages[messages.length - 1] },
        }),
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });
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
        <Box key={message.id} data-role={message.role}>
          {message.parts.map((part, i) => {
            if (part.type === "text") {
              return (
                <Text key={i} style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {part.text}
                </Text>
              );
            }
            if (part.type.startsWith("tool-") && "state" in part && part.state !== "output-available") {
              return (
                <Group key={i} gap={8}>
                  <Loader size={12} />
                  <Text size="sm" c="dimmed">
                    Working…
                  </Text>
                </Group>
              );
            }
            return null;
          })}
        </Box>
      ))}

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
