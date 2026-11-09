import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlSignal } from "~/lib/types/graphql";
import { HistoryTab, historyRowKey, type HistoryTabProps } from "./history-tab";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({
    dateTime: () => "15 Oct 2026",
    relativeTime: () => "1h",
  }),
  useNow: () => new Date("2026-10-15T12:00:00Z"),
}));

const signal = {
  id: "s1",
  title: "Flooding reported",
  description: null,
  severity: 3,
  publishedAt: "2026-10-15T11:00:00Z",
  source: { name: "dataminr" },
  generalLocation: null,
  originLocation: null,
  destinationLocation: null,
} as unknown as GqlSignal;

function renderTab(props: Partial<HistoryTabProps> = {}) {
  return render(
    <MantineProvider>
      <HistoryTab
        alerts={[]}
        events={[]}
        signals={[signal]}
        loading={false}
        sortOrder="newest"
        onSortChange={() => undefined}
        activeSources={null}
        onActiveSourcesChange={() => undefined}
        {...props}
      />
    </MantineProvider>,
  );
}

afterEach(cleanup);

describe("HistoryTab", () => {
  it("links the title to the row's page and shows no checkboxes by default", () => {
    renderTab();
    expect(screen.getByRole("link", { name: "Flooding reported" })).toHaveAttribute("href", "/signal/s1?from=detection");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("renders a checkbox per row that reflects and toggles the selection", () => {
    const onToggle = vi.fn();
    renderTab({ selection: { selectedKeys: new Set([historyRowKey({ kind: "signal", id: "s1" })]), onToggle } });
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ kind: "signal", id: "s1" }));
  });

  it("opens the row through onOpenRow instead of linking when given", () => {
    const onOpenRow = vi.fn();
    renderTab({ onOpenRow });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Flooding reported" }));
    expect(onOpenRow).toHaveBeenCalledWith(expect.objectContaining({ kind: "signal", id: "s1" }));
  });

  it("keys rows by kind and id", () => {
    expect(historyRowKey({ kind: "alert", id: "a1" })).toBe("alert:a1");
  });
});
