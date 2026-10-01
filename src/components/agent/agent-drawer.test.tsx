import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { AgentProvider, useAgent } from "~/components/agent/agent-provider";
import { AgentDrawer } from "~/components/agent/agent-drawer";

let flagOn = true;
let role: string | undefined = "viewer";
let pathname = "/map";

vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: (key: string) => (key === "agent" ? flagOn : true),
}));
vi.mock("~/trpc/react", () => ({
  api: {
    auth: { me: { useQuery: () => ({ data: role ? { user: { role } } : undefined }) } },
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

function renderDrawer() {
  return render(
    <MantineProvider>
      <AgentProvider>
        <Probe />
        <AgentDrawer />
      </AgentProvider>
    </MantineProvider>,
  );
}

const launcher = () => screen.queryByRole("button", { name: "Open the Agent drawer" });

beforeEach(() => {
  flagOn = true;
  role = "viewer";
  pathname = "/map";
  agent = undefined;
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
    expect(stored).toEqual({ open: true, threadId: agent!.threadId });

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
