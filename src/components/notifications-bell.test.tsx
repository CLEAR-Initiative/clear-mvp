import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlNotification } from "~/lib/types/graphql";

/**
 * The notifications bell: unread count on the target, Task notifications
 * listed newest first in the menu, opening one marks it read and goes to
 * its Event, and an actionUrl that is not an in-app path is never a link.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({ relativeTime: () => "2 hours ago" }),
}));
vi.mock("next/link", () => ({
  default: React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<"a">>(function LinkMock(props, ref) {
    return <a ref={ref} {...props} />;
  }),
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

let flagEnabled = true;
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: () => flagEnabled,
}));

let rows: GqlNotification[] = [];
let listError = false;
const listQuery = vi.fn((_input: unknown, opts: { enabled: boolean }) => ({
  data: opts.enabled && !listError ? rows : undefined,
  isError: listError,
}));
const markRead = vi.fn();
const invalidate = vi.fn(async () => undefined);
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ notifications: { list: { invalidate } } }),
    notifications: {
      list: { useQuery: (input: unknown, opts: { enabled: boolean }) => listQuery(input, opts) },
      markRead: { useMutation: () => ({ mutate: markRead }) },
    },
  },
}));

const { NotificationsBell } = await import("./notifications-bell");

function row(id: string, overrides: Partial<GqlNotification> = {}): GqlNotification {
  return {
    id,
    message: `Message ${id}`,
    notificationType: "task",
    actionUrl: "/event/evt-1",
    actionText: "View Event",
    status: "PENDING",
    createdAt: "2026-10-06T10:00:00Z",
    updatedAt: "2026-10-06T10:00:00Z",
    ...overrides,
  };
}

function renderBell(props: Partial<React.ComponentProps<typeof NotificationsBell>> = {}) {
  return render(
    <MantineProvider>
      <NotificationsBell variant="sidebar" {...props} />
    </MantineProvider>,
  );
}

describe("NotificationsBell", () => {
  afterEach(() => {
    cleanup();
    flagEnabled = true;
    rows = [];
    listError = false;
    push.mockReset();
    markRead.mockReset();
    listQuery.mockClear();
  });

  it("renders nothing and does not query while impact_prior_review is off", () => {
    flagEnabled = false;
    renderBell();
    expect(screen.queryByTestId("notifications-bell")).not.toBeInTheDocument();
    expect(listQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false }));
  });

  it("shows the unread count and lists task notifications newest first", async () => {
    rows = [
      row("old", { createdAt: "2026-10-01T10:00:00Z", status: "READ" }),
      row("alert", { notificationType: "alert" }),
      row("new", { createdAt: "2026-10-06T10:00:00Z" }),
    ];
    renderBell();
    expect(screen.getByTestId("notifications-bell")).toHaveAttribute("data-unread", "1");
    expect(screen.getByTestId("notifications-unread")).toHaveTextContent("1");
    fireEvent.click(screen.getByTestId("notifications-bell"));
    const items = await screen.findAllByTestId("notification-row");
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining("Message new"),
      expect.stringContaining("Message old"),
    ]);
    expect(items[0]).toHaveAttribute("data-unread", "true");
    expect(items[0]).toHaveAttribute("href", "/event/evt-1");
    expect(items[1]).toHaveAttribute("data-unread", "false");
  });

  it("opening an unread notification marks it read and goes to its Event", async () => {
    rows = [row("n1")];
    const onNavigate = vi.fn();
    renderBell({ variant: "drawer", onNavigate });
    fireEvent.click(screen.getByTestId("notifications-bell"));
    fireEvent.click(await screen.findByTestId("notification-row"));
    expect(markRead).toHaveBeenCalledWith({ id: "n1" });
    expect(push).toHaveBeenCalledWith("/event/evt-1");
    expect(onNavigate).toHaveBeenCalled();
  });

  it("lets a modifier click open the Event in a new tab, still marking the row read", async () => {
    rows = [row("n1")];
    renderBell();
    fireEvent.click(screen.getByTestId("notifications-bell"));
    fireEvent.click(await screen.findByTestId("notification-row"), { metaKey: true });
    expect(markRead).toHaveBeenCalledWith({ id: "n1" });
    expect(push).not.toHaveBeenCalled();
  });

  it("does not mark an already read notification again", async () => {
    rows = [row("n1", { status: "READ" })];
    renderBell();
    fireEvent.click(screen.getByTestId("notifications-bell"));
    fireEvent.click(await screen.findByTestId("notification-row"));
    expect(markRead).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/event/evt-1");
  });

  it("never links an actionUrl that is not an in-app path", async () => {
    rows = [row("n1", { actionUrl: "https://evil.example/x" })];
    renderBell();
    fireEvent.click(screen.getByTestId("notifications-bell"));
    const item = await screen.findByTestId("notification-row");
    expect(item).not.toHaveAttribute("href");
    fireEvent.click(item);
    expect(markRead).toHaveBeenCalledWith({ id: "n1" });
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the empty state, and the load error", async () => {
    renderBell();
    expect(screen.queryByTestId("notifications-unread")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("notifications-bell"));
    expect(await screen.findByTestId("notifications-empty")).toBeInTheDocument();
    cleanup();
    listError = true;
    renderBell();
    fireEvent.click(screen.getByTestId("notifications-bell"));
    await waitFor(() => expect(screen.getByTestId("notifications-error")).toBeInTheDocument());
  });
});
