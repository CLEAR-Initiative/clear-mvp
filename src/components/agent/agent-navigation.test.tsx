import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import type { UIMessage } from "ai";
import enMessages from "../../../messages/en.json";
import { AgentProvider, useAgent } from "~/components/agent/agent-provider";
import { AgentMessage } from "~/components/agent/agent-message";
import { AgentThread } from "~/components/agent/agent-thread";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/map" }));
vi.mock("~/components/feature-flags-provider", () => ({ useFeatureEnabled: () => true }));
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      agent: { listConversations: { invalidate: vi.fn() }, getConversation: { invalidate: vi.fn() } },
    }),
    auth: { me: { useQuery: () => ({ data: { user: { id: "u-alice", role: "viewer" } } }) } },
    agent: { getConversation: { useQuery: () => ({ isSuccess: false, data: undefined }) } },
  },
}));

const result = {
  moved: true as const,
  target: { kind: "event", id: "ev-1" },
  url: "/event/ev-1",
  label: "Floods in Kassala",
};
const answer = (state = "output-available"): UIMessage =>
  ({
    id: "a1",
    role: "assistant",
    parts: [{ type: "tool-navigate", toolCallId: "nav-1", state, input: {}, output: result }],
  }) as UIMessage;

let agent: ReturnType<typeof useAgent>;
function Probe() {
  agent = useAgent();
  return null;
}

function renderWith(children: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>
        <AgentProvider>
          <Probe />
          {children}
        </AgentProvider>
      </MantineProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  sessionStorage.clear();
  window.history.pushState({}, "", "/map?layer=events");
});
afterEach(() => cleanup());

describe("Agent navigation", () => {
  it("moves once, announces it with Back, and Back restores the exact view", () => {
    sessionStorage.setItem("map-nav-context", '{"country":"Sudan"}');
    renderWith(<AgentMessage message={answer()} />);

    act(() => agent.applyNavigation("nav-1", result));
    act(() => agent.applyNavigation("nav-1", result)); // a re-render must not move again
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/event/ev-1");

    // The page the user lands on rewrites the filters…
    sessionStorage.setItem("map-nav-context", '{"country":"Chad"}');
    expect(screen.getByTestId("agent-navigation")).toHaveTextContent("Moved you to Event: Floods in Kassala");

    // …and Back puts both the address and the filters back.
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(push).toHaveBeenLastCalledWith("/map?layer=events");
    expect(sessionStorage.getItem("map-nav-context")).toBe('{"country":"Sudan"}');
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("acts on a navigate result as it arrives in the Thread", () => {
    renderWith(null);
    const chat = agent.chat;
    act(() => {
      chat.messages = [answer()];
    });
    cleanup();
    // A fresh Thread render over that chat applies the move once.
    renderWith(<AgentThreadOver chat={chat} />);
    expect(push).toHaveBeenCalledWith("/event/ev-1");
  });

  it("never replays a move from a Thread's loaded history", () => {
    renderWith(null);
    act(() => agent.openThread("t-old", [answer()]));
    act(() => agent.applyNavigation("nav-1", result));
    expect(push).not.toHaveBeenCalled();
  });
});

function AgentThreadOver({ chat }: { chat: ReturnType<typeof useAgent>["chat"] }) {
  return <AgentThread chat={chat} />;
}
