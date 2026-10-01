import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { AgentThread, describeAgentError } from "~/components/agent/agent-thread";
import { publishCurrentView, resetCurrentViews } from "~/lib/agent-current-view";

let pathname = "/map";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
let clearDataOn = true;
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: (key: string) => (key === "agent_clear_data" ? clearDataOn : true),
}));

afterEach(() => {
  cleanup();
  resetCurrentViews();
  pathname = "/map";
  clearDataOn = true;
});

/** A chat whose turns are recorded instead of sent. */
function recordingChat() {
  const sent: string[] = [];
  const chat = new Chat<UIMessage>({
    id: "t-rec",
    transport: {
      sendMessages: async ({ messages }) => {
        const last = messages[messages.length - 1]!;
        sent.push(last.parts.map((p) => (p.type === "text" ? p.text : "")).join(""));
        throw new Error("recorded");
      },
      reconnectToStream: async () => null,
    },
  });
  return { chat, sent };
}

function renderThread(chat: Chat<UIMessage>) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      <MantineProvider>
        <AgentThread chat={chat} />
      </MantineProvider>
    </NextIntlClientProvider>,
  );
}

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

describe("An empty Thread", () => {
  it("introduces the CLEAR Agent with general suggestions", () => {
    renderThread(recordingChat().chat);
    expect(screen.getByTestId("agent-intro")).toHaveTextContent("shows which sources it used");
    expect(screen.getAllByTestId("agent-suggestion")).toHaveLength(3);
  });

  it("suggests questions about the Event on screen", () => {
    pathname = "/event/ev-1";
    publishCurrentView({ entity: { kind: "event", id: "ev-1" } });
    renderThread(recordingChat().chat);
    expect(screen.getByRole("button", { name: "Summarise this Event" })).toBeInTheDocument();
  });

  it("keeps to general suggestions while the Agent can't see the screen", () => {
    clearDataOn = false;
    pathname = "/event/ev-1";
    publishCurrentView({ entity: { kind: "event", id: "ev-1" } });
    renderThread(recordingChat().chat);
    expect(screen.queryByRole("button", { name: "Summarise this Event" })).not.toBeInTheDocument();
  });

  it("sends a suggestion as the first turn", async () => {
    pathname = "/detection";
    const { chat, sent } = recordingChat();
    renderThread(chat);
    const suggestion = screen.getAllByTestId("agent-suggestion")[0]!;
    fireEvent.click(suggestion);
    await vi.waitFor(() => expect(sent).toEqual([suggestion.textContent]));
    expect(screen.queryByTestId("agent-intro")).not.toBeInTheDocument();
  });
});

describe("The input box", () => {
  it("sends with the send button and clears", async () => {
    const { chat, sent } = recordingChat();
    renderThread(chat);
    const input = screen.getByRole("textbox", { name: "Message the CLEAR Agent" });
    expect(input).toHaveAttribute("placeholder", "Ask anything");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "Access in Darfur?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await vi.waitFor(() => expect(sent).toEqual(["Access in Darfur?"]));
    expect(input).toHaveValue("");
  });
});
