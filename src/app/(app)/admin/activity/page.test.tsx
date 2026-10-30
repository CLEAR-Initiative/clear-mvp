import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../../messages/en.json";
import type { ActivityOverviewResult } from "~/server/api/routers/adminActivity";

/** The /admin/activity page's states, with adminActivity stubbed. */

let queryState: { data?: ActivityOverviewResult; error?: { message: string } | null } = {};
const mutate = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    adminActivity: {
      overview: { useQuery: () => ({ isFetching: false, error: null, ...queryState }) },
      nrcExport: { useMutation: () => ({ mutate, isPending: false, error: null }) },
    },
  },
}));

const { default: AdminActivityPage } = await import("./page");

afterEach(() => {
  cleanup();
  queryState = {};
});

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>
        <AdminActivityPage />
      </MantineProvider>
    </NextIntlClientProvider>,
  );
}

describe("AdminActivityPage", () => {
  it("renders action counts, agent usage and the export button", () => {
    queryState = {
      data: {
        status: "ok",
        overview: {
          activity: {
            from: "2026-10-01T00:00:00.000Z",
            to: "2026-10-29T00:00:00.000Z",
            totals: { total: 1234, actions: [{ action: "page_view", count: 1234 }] },
          },
          agent: {
            from: "2026-10-01T00:00:00.000Z",
            to: "2026-10-29T00:00:00.000Z",
            turns: 42,
            answers: 40,
            distinctUsers: 7,
            costUsd: 3.5,
            inputTokens: 1000,
            outputTokens: 500,
            byRoute: [{ route: "/crisis", turns: 42, distinctUsers: 7 }],
            byDay: [],
          },
        },
      },
    };
    renderPage();
    expect(screen.getByText("page_view")).toBeTruthy();
    expect(screen.getAllByText("1,234").length).toBe(2);
    expect(screen.getByText("$3.50")).toBeTruthy();
    expect(screen.getByText("/crisis")).toBeTruthy();
    screen.getByRole("button", { name: /Download NRC export/ }).click();
    expect(mutate).toHaveBeenCalled();
  });

  it("shows the unavailable notice", () => {
    queryState = { data: { status: "unavailable" } };
    renderPage();
    expect(screen.getByText("Activity not available yet")).toBeTruthy();
  });
});
