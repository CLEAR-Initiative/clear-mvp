import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { WebhookSubscription } from "~/lib/types/teams";

vi.mock("next-intl", () => ({
  useTranslations:
    (ns?: string) =>
    (key: string, vars?: Record<string, unknown>) =>
      `${ns ? `${ns}.` : ""}${key}${vars ? `:${JSON.stringify(vars)}` : ""}`,
}));

let webhooks: WebhookSubscription[];
const listQuery = vi.fn();
const createMutate = vi.fn();
const updateMutate = vi.fn();
const deleteMutate = vi.fn();
const rotateMutate = vi.fn();
const invalidate = vi.fn();

const mutation = (mutateAsync: (...a: unknown[]) => Promise<unknown>) => ({
  mutateAsync,
  isPending: false,
  error: null,
});

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ teams: { alertWebhooks: { list: { invalidate } } } }),
    teams: {
      alertWebhooks: {
        list: {
          useQuery: (input: unknown, opts: { enabled?: boolean }) => (
            listQuery(input, opts),
            { data: opts.enabled ? webhooks : undefined, isLoading: false }
          ),
        },
        create: { useMutation: () => mutation(createMutate) },
        update: { useMutation: () => mutation(updateMutate) },
        delete: { useMutation: () => mutation(deleteMutate) },
        rotateSecret: { useMutation: () => mutation(rotateMutate) },
      },
    },
  },
}));

const { WebhooksSection } = await import("./webhooks-section");

function webhook(overrides: Partial<WebhookSubscription> = {}): WebhookSubscription {
  return {
    id: "wh-1",
    name: "Ops Slack bridge",
    targetUrl: "https://hooks.example.org/clear",
    source: null,
    teamId: "team-1",
    alertTypeFilter: ["CF"],
    minSeverity: 3,
    active: true,
    createdAt: "2026-10-18T10:00:00.000Z",
    secret: null,
    ...overrides,
  };
}

const renderSection = (canManage = true) =>
  render(
    <MantineProvider>
      <WebhooksSection teamId="team-1" canManage={canManage} />
    </MantineProvider>,
  );

beforeEach(() => {
  webhooks = [webhook()];
  createMutate.mockResolvedValue(webhook({ secret: "whsec_live_once" }));
  rotateMutate.mockResolvedValue(webhook({ secret: "whsec_rotated" }));
  updateMutate.mockResolvedValue(webhook({ active: false }));
  deleteMutate.mockResolvedValue(true);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Team settings > Webhooks section", () => {
  it("renders nothing and does not query for users who cannot manage the team", () => {
    renderSection(false);
    expect(screen.queryByTestId("team-webhooks-section")).not.toBeInTheDocument();
    // list query must stay disabled so no admin-only data is fetched.
    expect(listQuery).toHaveBeenLastCalledWith(
      { teamId: "team-1" },
      expect.objectContaining({ enabled: false }),
    );
  });

  it("lists the team's webhooks with name, URL and filters for a manager", () => {
    renderSection();
    const row = screen.getByTestId("team-webhooks-row");
    expect(within(row).getByText("Ops Slack bridge")).toBeInTheDocument();
    expect(within(row).getByText("https://hooks.example.org/clear")).toBeInTheDocument();
    expect(within(row).getByText("CF")).toBeInTheDocument();
    expect(within(row).getByText('settings.team.webhooks.filters.minSeverity:{"level":3}')).toBeInTheDocument();
  });

  it("shows the empty state when the team has no webhooks", () => {
    webhooks = [];
    renderSection();
    expect(screen.getByText("settings.team.webhooks.none")).toBeInTheDocument();
    expect(screen.queryByTestId("team-webhooks-row")).not.toBeInTheDocument();
  });

  it("creates a webhook from the form and reveals the one-time secret", async () => {
    renderSection();
    fireEvent.change(screen.getByTestId("team-webhooks-name"), { target: { value: "My hook" } });
    fireEvent.change(screen.getByTestId("team-webhooks-url"), {
      target: { value: "https://example.com/hook" },
    });
    fireEvent.change(screen.getByTestId("team-webhooks-filter"), { target: { value: "CF, FL" } });
    fireEvent.click(screen.getByTestId("team-webhooks-submit"));

    await vi.waitFor(() =>
      expect(createMutate).toHaveBeenCalledWith({
        teamId: "team-1",
        name: "My hook",
        targetUrl: "https://example.com/hook",
        alertTypeFilter: ["CF", "FL"],
        minSeverity: undefined,
      }),
    );
    const secret = await screen.findByTestId("team-webhooks-secret-value");
    expect(secret).toHaveValue("whsec_live_once");
    expect(invalidate).toHaveBeenCalledWith({ teamId: "team-1" });
  });

  it("rotates the secret and surfaces the new one", async () => {
    renderSection();
    fireEvent.click(screen.getByTestId("team-webhooks-rotate"));
    await vi.waitFor(() => expect(rotateMutate).toHaveBeenCalledWith({ id: "wh-1" }));
    const secret = await screen.findByTestId("team-webhooks-secret-value");
    expect(secret).toHaveValue("whsec_rotated");
  });

  it("toggles active via the switch", async () => {
    renderSection();
    fireEvent.click(screen.getByTestId("team-webhooks-active"));
    await vi.waitFor(() =>
      expect(updateMutate).toHaveBeenCalledWith({ id: "wh-1", active: false }),
    );
  });

  it("deletes after confirmation", async () => {
    renderSection();
    fireEvent.click(screen.getByTestId("team-webhooks-delete"));
    await vi.waitFor(() => expect(deleteMutate).toHaveBeenCalledWith({ id: "wh-1" }));
  });
});
