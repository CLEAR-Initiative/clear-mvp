import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import arMessages from "../../../messages/ar.json";

import { AgentProvider, useAgent } from "~/components/agent/agent-provider";
import { AgentDrawer } from "~/components/agent/agent-drawer";
import { publishCurrentView, resetCurrentViews } from "~/lib/agent-current-view";

let flagOn = true;
let role: string | undefined = "viewer";
let userId = "u-alice";
let pathname = "/map";

let clearDataOn = true;
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: (key: string) =>
    key === "agent" ? flagOn : key === "agent_clear_data" ? clearDataOn : true,
}));
let conversations: Array<{ id: string; title: string | null; updatedAt: string }> = [];
let team: { activeTeamId: string; activeTeam: { id: string; name: string } } | null = null;
vi.mock("~/providers/team-provider", () => ({ useOptionalTeam: () => team }));
let storedConversation: { id: string; title: string; messages: unknown[] } | null = null;
let conversationLoading = false;
let conversationFailed = false;
const getConversation = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ agent: { listConversations: { invalidate: vi.fn() } } }),
    auth: { me: { useQuery: () => ({ data: role ? { user: { id: userId, role } } : undefined }) } },
    agent: {
      listConversations: {
        useQuery: () => ({ data: { items: conversations, nextCursor: null }, isLoading: false, isSuccess: true }),
      },
      getConversation: {
        useQuery: (input: { id: string }, opts: { enabled: boolean }) => {
          getConversation(input, opts);
          if (opts.enabled && conversationLoading) return { isSuccess: false, data: undefined };
          if (opts.enabled && conversationFailed) return { isSuccess: false, isError: true, data: undefined };
          return opts.enabled
            ? { isSuccess: true, data: storedConversation?.id === input.id ? storedConversation : null }
            : { isSuccess: false, data: undefined };
        },
      },
    },
  },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let agent: ReturnType<typeof useAgent> | undefined;
function Probe() {
  agent = useAgent();
  return null;
}

function renderDrawer(locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? arMessages : enMessages}>
      <MantineProvider>
        <AgentProvider>
          <Probe />
          <AgentDrawer />
        </AgentProvider>
      </MantineProvider>
    </NextIntlClientProvider>,
  );
}

const launcher = () => screen.queryByRole("button", { name: "Open the Agent drawer" });

beforeEach(() => {
  flagOn = true;
  clearDataOn = true;
  role = "viewer";
  userId = "u-alice";
  pathname = "/map";
  agent = undefined;
  storedConversation = null;
  conversationLoading = false;
  conversationFailed = false;
  conversations = [];
  team = null;
  getConversation.mockClear();
  sessionStorage.clear();
  localStorage.clear();
  resetCurrentViews();
});

afterEach(() => cleanup());

describe("AgentDrawer gating", () => {
  it("offers the Agent drawer to an approved user when the flag is on", () => {
    renderDrawer();
    expect(launcher()).toBeInTheDocument();
  });

  it("hides everything while the agent flag is off", () => {
    flagOn = false;
    renderDrawer();
    expect(launcher()).not.toBeInTheDocument();
    expect(agent?.available).toBe(false);
  });

  it("does not offer the Agent to a pending user", () => {
    role = "pending";
    renderDrawer();
    expect(launcher()).not.toBeInTheDocument();
    expect(agent?.available).toBe(false);
  });

  it("does not offer the Agent before the user is known", () => {
    role = undefined;
    renderDrawer();
    expect(launcher()).not.toBeInTheDocument();
  });

  it("has no launcher on the Agent page, which shows the Thread itself", () => {
    pathname = "/agent";
    renderDrawer();
    expect(launcher()).not.toBeInTheDocument();
  });
});

describe("AgentDrawer state", () => {
  it("opens the drawer with the Thread and remembers it across reloads", async () => {
    renderDrawer();
    fireEvent.click(launcher()!);
    expect(await screen.findByLabelText("Message the CLEAR Agent")).toBeInTheDocument();
    const stored = JSON.parse(sessionStorage.getItem("agent-drawer")!);
    expect(stored).toEqual({ open: true, threadId: agent!.threadId, userId: "u-alice" });

    cleanup();
    renderDrawer();
    expect(agent!.threadId).toBe(stored.threadId);
    expect(agent!.open).toBe(true);
  });

  it("shares one chat for the active Thread and switches it on New thread", () => {
    renderDrawer();
    const first = agent!.chat;
    expect(first.id).toBe(agent!.threadId);
    act(() => agent!.newThread());
    expect(agent!.chat).not.toBe(first);
    expect(agent!.chat.id).toBe(agent!.threadId);
    expect(JSON.parse(sessionStorage.getItem("agent-drawer")!).threadId).toBe(agent!.threadId);
  });
});

describe("Thread restore", () => {
  it("loads a restored Thread's stored turns into its chat after a reload", () => {
    sessionStorage.setItem(
      "agent-drawer",
      JSON.stringify({ open: false, threadId: "t-saved", userId: "u-alice" }),
    );
    storedConversation = {
      id: "t-saved",
      title: "Darfur",
      messages: [
        { id: "m1", role: "user", parts: [{ type: "text", text: "Access in Darfur?" }] },
        { id: "m2", role: "assistant", parts: [{ type: "text", text: "Restricted." }] },
      ],
    };
    renderDrawer();
    expect(agent!.threadId).toBe("t-saved");
    expect(agent!.chat.id).toBe("t-saved");
    expect(agent!.chat.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("doesn't offer a loading Thread's empty state, so its turns can't be hidden", async () => {
    sessionStorage.setItem(
      "agent-drawer",
      JSON.stringify({ open: true, threadId: "t-saved", userId: "u-alice" }),
    );
    conversationLoading = true;
    renderDrawer();
    expect(await screen.findByTestId("agent-thread-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-suggestion")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message the CLEAR Agent" })).toBeDisabled();
  });

  it("doesn't hang on a Thread whose turns failed to load: it says so and offers a retry", async () => {
    sessionStorage.setItem(
      "agent-drawer",
      JSON.stringify({ open: true, threadId: "t-saved", userId: "u-alice" }),
    );
    conversationFailed = true;
    renderDrawer();
    expect(await screen.findByTestId("agent-thread-load-failed")).toHaveTextContent(
      "This conversation couldn't be loaded.",
    );
    expect(screen.queryByTestId("agent-thread-loading")).not.toBeInTheDocument();
    // Typing works, but sending waits for the turns (or a New thread).
    const input = screen.getByRole("textbox", { name: "Message the CLEAR Agent" });
    expect(input).toBeEnabled();
    fireEvent.change(input, { target: { value: "Any update?" } });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    // Retry loads it again, and this time it arrives.
    conversationFailed = false;
    storedConversation = {
      id: "t-saved",
      title: "Access",
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "Access in Darfur?" }] }],
    };
    getConversation.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await vi.waitFor(() => expect(agent!.chat.messages.map((m) => m.id)).toEqual(["m1"]));
    expect(getConversation).toHaveBeenCalledWith({ id: "t-saved" }, expect.objectContaining({ enabled: true }));
    expect(screen.queryByTestId("agent-thread-load-failed")).not.toBeInTheDocument();
  });

  it("never restores another user's Thread on the same tab, and forgets it", () => {
    sessionStorage.setItem(
      "agent-drawer",
      JSON.stringify({ open: true, threadId: "t-bob", userId: "u-bob" }),
    );
    storedConversation = { id: "t-bob", title: "Bob's", messages: [] };
    renderDrawer();
    expect(agent!.threadId).not.toBe("t-bob");
    expect(agent!.open).toBe(false);
    expect(getConversation).not.toHaveBeenCalledWith({ id: "t-bob" }, expect.objectContaining({ enabled: true }));
    expect(sessionStorage.getItem("agent-drawer")).toBeNull();
  });

  it("keeps the live chat when the active Thread is opened again", () => {
    renderDrawer();
    const chat = agent!.chat;
    act(() => agent!.openThread(agent!.threadId));
    expect(agent!.chat).toBe(chat);
  });

  it("starts a fresh Thread with nothing to load", () => {
    renderDrawer();
    act(() => agent!.newThread());
    expect(agent!.chat.messages).toEqual([]);
    expect(getConversation).not.toHaveBeenCalledWith({ id: agent!.threadId }, expect.objectContaining({ enabled: true }));
  });
});

describe("AgentDrawer languages", () => {
  it("puts the launcher on the inline-end side: right for English", () => {
    renderDrawer("en");
    const affix = launcher()!.closest(".mantine-Affix-root") as HTMLElement;
    expect(affix.style.getPropertyValue("--affix-right")).not.toBe("");
    expect(affix.style.getPropertyValue("--affix-left")).toBe("");
  });

  it("mirrors to the left, with Arabic labels, under Arabic", () => {
    renderDrawer("ar");
    const button = screen.getByRole("button", { name: "فتح لوحة الوكيل" });
    const affix = button.closest(".mantine-Affix-root") as HTMLElement;
    expect(affix.style.getPropertyValue("--affix-left")).not.toBe("");
    expect(affix.style.getPropertyValue("--affix-right")).toBe("");
  });
});

describe("Current view on each turn", () => {
  async function sentBody(): Promise<Record<string, unknown>> {
    const fetchMock = vi.fn(async () => new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    renderDrawer();
    await agent!.chat.sendMessage({ text: "Why is this one severity 4?" }).catch(() => undefined);
    vi.unstubAllGlobals();
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    return JSON.parse(init.body as string) as Record<string, unknown>;
  }

  it("sends what is on screen with the turn", async () => {
    window.history.pushState({}, "", "/event/ev-42");
    const unpublish = publishCurrentView({ entity: { kind: "event", id: "ev-42" } });
    const body = await sentBody();
    unpublish();
    expect(body.currentView).toEqual({ route: "/event/ev-42", entity: { kind: "event", id: "ev-42" } });
  });

  it("sends no Current view while agent_clear_data is off", async () => {
    clearDataOn = false;
    const body = await sentBody();
    expect(body).not.toHaveProperty("currentView");
  });
});

describe("AgentDrawer header", () => {
  function openDrawer() {
    renderDrawer();
    fireEvent.click(launcher()!);
  }

  it("names the CLEAR Agent, with a new Thread's subtitle", async () => {
    openDrawer();
    const header = await screen.findByTestId("agent-drawer-header");
    expect(header).toHaveTextContent("CLEAR Agent");
    expect(header).toHaveTextContent("New thread");
  });

  it("shows the active Thread's title once it has one", async () => {
    renderDrawer();
    conversations = [{ id: agent!.threadId, title: "Access in Darfur", updatedAt: "2026-10-01T10:00:00Z" }];
    fireEvent.click(launcher()!);
    expect(await screen.findByTestId("agent-drawer-header")).toHaveTextContent("Access in Darfur");
  });

  it("remembers the chosen width for next time", async () => {
    openDrawer();
    fireEvent.click(await screen.findByRole("radio", { name: "Large" }));
    expect(localStorage.getItem("agent-drawer-width")).toBe("l");
    cleanup();
    renderDrawer(); // reopens: the drawer's open state is restored too
    expect(await screen.findByRole("radio", { name: "Large" })).toBeChecked();
  });

  it("opens a recent Conversation from the history menu", async () => {
    conversations = [
      { id: "t-darfur", title: "Access in Darfur", updatedAt: "2026-10-01T10:00:00Z" },
      { id: "t-untitled", title: null, updatedAt: "2026-09-30T10:00:00Z" },
    ];
    openDrawer();
    fireEvent.click(await screen.findByRole("button", { name: "Recent conversations" }));
    // `hidden`: jsdom measures every element at 0×0, so Mantine's hideDetached
    // treats the target as detached and sets the open dropdown display:none.
    const item = (name: RegExp) => screen.findByRole("menuitem", { name, hidden: true });
    expect(await item(/Untitled thread/)).toBeInTheDocument();
    expect(await item(/Access in Darfur/)).not.toHaveAttribute("aria-current");
    expect(await item(/All conversations/)).toHaveAttribute("href", "/agent");
    fireEvent.click(await item(/Access in Darfur/));
    expect(agent!.threadId).toBe("t-darfur");
    fireEvent.click(screen.getByRole("button", { name: "Recent conversations" }));
    expect(await item(/Access in Darfur/)).toHaveAttribute("aria-current", "true");
  });

  it("expands to the Agent page", async () => {
    openDrawer();
    expect(await screen.findByRole("link", { name: "Open Agent page" })).toHaveAttribute("href", "/agent");
  });
});

describe("AgentDrawer context row", () => {
  it("shows the Current view the next turn will send, by name", async () => {
    team = { activeTeamId: "team-1", activeTeam: { id: "team-1", name: "NRC Sudan" } };
    pathname = "/detection";
    publishCurrentView({ filters: { teamId: "team-1", country: "SDN", severityMin: 3 } });
    publishCurrentView({ entity: { kind: "event", id: "ev-1", label: "Floods in Kassala" } });
    renderDrawer();
    fireEvent.click(launcher()!);
    const row = await screen.findByTestId("agent-context");
    expect(row).toHaveTextContent("NRC Sudan");
    expect(row).toHaveTextContent("Detection");
    expect(row).toHaveTextContent("Floods in Kassala");
    expect(row).toHaveTextContent("2 filters");
  });

  it("names the entity by its kind until it has a title", async () => {
    pathname = "/signal/s-1";
    publishCurrentView({ entity: { kind: "signal", id: "s-1" } });
    renderDrawer();
    fireEvent.click(launcher()!);
    const row = await screen.findByTestId("agent-context");
    expect(row).toHaveTextContent("Signal");
    expect(row).not.toHaveTextContent("Detection");
  });

  it("is hidden while no Current view is sent (agent_clear_data off)", async () => {
    clearDataOn = false;
    publishCurrentView({ entity: { kind: "event", id: "ev-1", label: "Floods in Kassala" } });
    renderDrawer();
    fireEvent.click(launcher()!);
    await screen.findByTestId("agent-drawer-header");
    expect(screen.queryByTestId("agent-context")).not.toBeInTheDocument();
  });
});
