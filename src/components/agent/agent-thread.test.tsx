import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { AgentThread, describeAgentError } from "~/components/agent/agent-thread";

afterEach(() => cleanup());

describe("describeAgentError", () => {
  it("reads the budget-spent 429 body, with when it resets", () => {
    const parsed = describeAgentError(
      new Error(JSON.stringify({ error: "x", code: "AGENT_BUDGET_EXCEEDED", resetsAt: "2026-10-02T00:00:00.000Z" })),
    );
    expect(parsed.code).toBe("AGENT_BUDGET_EXCEEDED");
    expect(parsed.budgetResetsAt?.toISOString()).toBe("2026-10-02T00:00:00.000Z");
  });

  it("keeps the route's error code, and copes with a message that isn't JSON", () => {
    expect(
      describeAgentError(new Error('{"error":"This Thread belongs to another user.","code":"THREAD_FORBIDDEN"}')),
    ).toEqual({ code: "THREAD_FORBIDDEN", message: "This Thread belongs to another user." });
    expect(describeAgentError(new Error("Failed to fetch"))).toEqual({ message: "Failed to fetch" });
  });
});

describe("AgentThread", () => {
  it("tells the user the budget is spent and when it resets", async () => {
    const chat = new Chat<UIMessage>({
      id: "t1",
      transport: {
        sendMessages: async () => {
          throw new Error(
            JSON.stringify({ error: "x", code: "AGENT_BUDGET_EXCEEDED", resetsAt: "2026-10-02T00:00:00.000Z" }),
          );
        },
        reconnectToStream: async () => null,
      },
    });
    render(
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
        <MantineProvider>
          <AgentThread chat={chat} />
        </MantineProvider>
      </NextIntlClientProvider>,
    );
    await chat.sendMessage({ text: "Darfur?" }).catch(() => undefined);
    const alert = await screen.findByTestId("agent-budget-spent");
    expect(alert).toHaveTextContent("Your daily Agent budget is spent.");
    expect(alert).toHaveTextContent("It resets at Oct 2, 2026");
  });
});
