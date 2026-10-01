"use client";

import { Alert, Box, Button, Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui";
import { useAgent } from "~/components/agent/agent-provider";
import { AgentThread } from "~/components/agent/agent-thread";

export default function AgentPage() {
  const { available, chat, newThread } = useAgent();

  return (
    <>
      <PageHeader title="Agent" subtitle="Ask the CLEAR Agent" breadcrumbs={["CLEAR", "Agent"]} />
      <Box p={24} style={{ flex: 1, overflowY: "auto" }}>
        <Box style={{ maxWidth: 820 }}>
          {available ? (
            <>
              <Group justify="flex-end" mb={16}>
                <Button size="xs" variant="subtle" leftSection={<IconPlus size={14} />} onClick={newThread}>
                  New thread
                </Button>
              </Group>
              <AgentThread key={chat.id} chat={chat} />
            </>
          ) : (
            <Alert color="gray">The CLEAR Agent isn&apos;t available for your account.</Alert>
          )}
        </Box>
      </Box>
    </>
  );
}
