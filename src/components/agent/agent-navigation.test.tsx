import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import type { UIMessage } from "ai";
import enMessages from "../../../messages/en.json";
import { AgentProvider, AgentViewBoundary, useAgent } from "~/components/agent/agent-provider";
import { AgentMessage } from "~/components/agent/agent-message";
import { AgentThread } from "~/components/agent/agent-thread";

const push = vi.fn();
let pathname = "/map";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => pathname }));
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
  pathname = "/map";
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

  it("remounts the page on Back, so it re-reads the restored state", () => {
    const mounts = vi.fn();
    function Page() {
      React.useEffect(() => {
        mounts();
      }, []);
      return null;
    }
    renderWith(
      <AgentViewBoundary>
        <Page />
      </AgentViewBoundary>,
    );
    expect(mounts).toHaveBeenCalledTimes(1);
    act(() => agent.applyNavigation("nav-1", result));
    expect(mounts).toHaveBeenCalledTimes(1);
    act(() => agent.goBack("nav-1"));
    expect(mounts).toHaveBeenCalledTimes(2);
  });

  it("acts on a navigate result as it streams in, even with no Thread on screen", () => {
    renderWith(null);
    act(() => {
      agent.chat.messages = [answer("input-available")];
    });
    expect(push).not.toHaveBeenCalled();
    act(() => {
      agent.chat.messages = [answer()];
    });
    expect(push).toHaveBeenCalledWith("/event/ev-1");
  });

  it("never replays a move from a Thread opened from history, with the Thread on screen", () => {
    function OpenThread() {
      const { chat } = useAgent();
      return <AgentThread key={chat.id} chat={chat} />;
    }
    renderWith(<OpenThread />);
    act(() => agent.openThread("t-old", [answer()]));
    expect(screen.getByTestId("agent-navigation")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("Agent navigation from the Agent page", () => {
  it("opens the Agent drawer on the same Thread before moving", async () => {
    const { AgentDrawer } = await import("~/components/agent/agent-drawer");
    window.history.pushState({}, "", "/agent");
    pathname = "/agent";
    const view = renderWith(<AgentDrawer />);
    const threadId = agent.threadId;
    expect(agent.open).toBe(false);

    act(() => agent.applyNavigation("nav-1", result));
    expect(agent.open).toBe(true);
    expect(agent.threadId).toBe(threadId);
    expect(push).toHaveBeenCalledWith("/event/ev-1");

    // On the new page the drawer shows that same Thread.
    pathname = "/event/ev-1";
    view.rerender(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <MantineProvider>
          <AgentProvider>
            <Probe />
            <AgentDrawer />
          </AgentProvider>
        </MantineProvider>
      </NextIntlClientProvider>,
    );
    expect(await screen.findByLabelText("Message the CLEAR Agent")).toBeInTheDocument();
  });

  it("leaves the drawer alone when moving from any other page", () => {
    renderWith(null);
    act(() => agent.applyNavigation("nav-2", result));
    expect(agent.open).toBe(false);
  });
});

