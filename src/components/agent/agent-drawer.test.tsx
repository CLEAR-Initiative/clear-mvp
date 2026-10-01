import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import arMessages from "../../../messages/ar.json";

import { AgentProvider, useAgent } from "~/components/agent/agent-provider";
import { AgentDrawer } from "~/components/agent/agent-drawer";

let flagOn = true;
let role: string | undefined = "viewer";
let userId = "u-alice";
let pathname = "/map";

vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: (key: string) => (key === "agent" ? flagOn : true),
}));
let storedConversation: { id: string; title: string; messages: unknown[] } | null = null;
const getConversation = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ agent: { listConversations: { invalidate: vi.fn() } } }),
    auth: { me: { useQuery: () => ({ data: role ? { user: { id: userId, role } } : undefined }) } },
    agent: {
      getConversation: {
        useQuery: (input: { id: string }, opts: { enabled: boolean }) => {
          getConversation(input, opts);
          return opts.enabled
            ? { isSuccess: true, data: storedConversation?.id === input.id ? storedConversation : null }
            : { isSuccess: false, data: undefined };
        },
      },
    },
  },
}));
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
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
  role = "viewer";
  userId = "u-alice";
  pathname = "/map";
  agent = undefined;
  storedConversation = null;
  getConversation.mockClear();
  sessionStorage.clear();
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
