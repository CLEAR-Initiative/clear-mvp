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

let pathname = "/map";
let search = "";
/** The router: push is a transition; the URL changes only when it lands (`land`). */
let pushed: string | null = null;
const push = vi.fn((url: string) => {
  pushed = url;
});
function commitPush() {
  if (!pushed) return;
  const u = new URL(pushed, "http://app.local");
  pathname = u.pathname;
  search = u.search.slice(1);
  window.history.pushState({}, "", pushed);
  pushed = null;
}
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));
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
  content: { label: "Floods in Kassala" },
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
  const tree = () => (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>
        <AgentProvider>
          <Probe />
          {children}
        </AgentProvider>
      </MantineProvider>
    </NextIntlClientProvider>
  );
  const view = render(tree());
  /** The router commits the URL it was pushed to. */
  const land = () => {
    commitPush();
    view.rerender(tree());
  };
  return { ...view, land };
}

beforeEach(() => {
  pathname = "/map";
  search = "layer=events";
  pushed = null;
  push.mockClear();
  sessionStorage.clear();
  window.history.pushState({}, "", "/map?layer=events");
});
afterEach(() => cleanup());

describe("Agent navigation", () => {
  it("moves once, announces it with Back, and Back restores the exact view", () => {
    sessionStorage.setItem("map-nav-context", '{"country":"Sudan"}');
    sessionStorage.setItem("clear.map.viewState.v1", '{"region":"North Darfur"}');
    const { land } = renderWith(<AgentMessage message={answer()} />);

    act(() => agent.applyNavigation("nav-1", result));
    act(() => agent.applyNavigation("nav-1", result)); // a re-render must not move again
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/event/ev-1");
    land();

    // The page the user lands on rewrites the filters and the Map's view…
    sessionStorage.setItem("map-nav-context", '{"country":"Chad"}');
    sessionStorage.setItem("clear.map.viewState.v1", '{"region":"Ouaddaï"}');
    expect(screen.getByTestId("agent-navigation")).toHaveTextContent("Moved you to Event: Floods in Kassala");

    // …and Back puts the address, the filters and the view back, once the
    // address has landed.
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(push).toHaveBeenLastCalledWith("/map?layer=events");
    land();
    expect(sessionStorage.getItem("map-nav-context")).toBe('{"country":"Sudan"}');
    expect(sessionStorage.getItem("clear.map.viewState.v1")).toBe('{"region":"North Darfur"}');
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("keeps the page unmounted until Back lands, then remounts it on the restored URL and state", () => {
    sessionStorage.setItem("detection-filters", '{"regionId":"loc-nd"}');
    const seen: Array<{ url: string; stored: string | null }> = [];
    const unmounts = vi.fn();
    function Page() {
      React.useEffect(() => {
        seen.push({ url: `${pathname}?${search}`, stored: sessionStorage.getItem("detection-filters") });
        return unmounts;
      }, []);
      return null;
    }
    const { land } = renderWith(
      <AgentViewBoundary>
        <Page />
      </AgentViewBoundary>,
    );
    act(() => agent.applyNavigation("nav-1", result));
    land();
    // The page the Agent opened writes its own filters.
    sessionStorage.setItem("detection-filters", '{"regionId":null}');

    act(() => agent.goBack("nav-1"));
    // Unmounted at once; nothing renders on the Agent's URL meanwhile.
    expect(unmounts).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(1);

    land();
    expect(seen).toEqual([
      { url: "/map?layer=events", stored: '{"regionId":"loc-nd"}' },
      { url: "/map?layer=events", stored: '{"regionId":"loc-nd"}' },
    ]);
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

