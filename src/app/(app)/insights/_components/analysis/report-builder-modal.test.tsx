import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { ReportSectionChoice } from "~/lib/analysis-report";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, vars?: Record<string, unknown>) =>
    `${ns ? `${ns}.` : ""}${key}${vars ? `:${JSON.stringify(vars)}` : ""}`,
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const { ReportBuilderModal } = await import("./report-builder-modal");

// A fresh array each call, as the parent derives it from its data on every render.
const initial = (): ReportSectionChoice[] => [
  { key: "keyDevelopments", included: true, available: true, count: 3 },
  { key: "hazards", included: true, available: true, count: 2 },
];

const modal = (opened: boolean, sections = initial()) => (
  <MantineProvider>
    <ReportBuilderModal opened={opened} onClose={() => {}} initial={sections} busy={false} onCreate={() => {}} />
  </MantineProvider>
);

afterEach(cleanup);

describe("ReportBuilderModal", () => {
  it("keeps the reader's choices when the content changes while open", () => {
    const view = render(modal(true));
    fireEvent.click(screen.getByTestId("report-include-hazards"));
    expect(screen.getByTestId("report-include-hazards")).not.toBeChecked();

    // e.g. "Update now" polling lands a new version while the builder is open.
    view.rerender(modal(true, initial().map((x) => ({ ...x, count: (x.count ?? 0) + 1 }))));
    expect(screen.getByTestId("report-include-hazards")).not.toBeChecked();
    expect(screen.getByTestId("report-include-keyDevelopments")).toBeChecked();
  });

  it("starts from the current content again when reopened", () => {
    const view = render(modal(true));
    fireEvent.click(screen.getByTestId("report-include-hazards"));
    expect(screen.getByTestId("report-include-hazards")).not.toBeChecked();

    view.rerender(modal(false));
    view.rerender(modal(true));
    expect(screen.getByTestId("report-include-hazards")).toBeChecked();
  });
});
