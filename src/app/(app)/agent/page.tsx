"use client";

import { useState } from "react";
import { Box } from "@mantine/core";
import { PageHeader } from "~/components/ui";
import { AgentThread } from "~/components/agent/agent-thread";

export default function AgentPage() {
  const [threadId] = useState(() => crypto.randomUUID());

  return (
    <>
      <PageHeader title="Agent" subtitle="Ask the CLEAR Agent" breadcrumbs={["CLEAR", "Agent"]} />
      <Box p={24} style={{ flex: 1, overflowY: "auto" }}>
        <Box style={{ maxWidth: 820 }}>
          <AgentThread threadId={threadId} />
        </Box>
      </Box>
    </>
  );
}
