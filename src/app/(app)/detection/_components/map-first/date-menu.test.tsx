import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DateMenu } from "./date-menu";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

type Props = React.ComponentProps<typeof DateMenu>;

function renderMenu(props: Partial<Props> = {}) {
  const handlers = { onPreset: vi.fn(), onCustomRange: vi.fn(), onActiveChange: vi.fn() };
  render(
    <DateMenu
      label="Last 7 days"
      dateKey="7d"
      isDefault
      fromIso="2026-11-18T12:00:00.000Z"
      toIso="2026-11-25T12:00:00.000Z"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("DateMenu", () => {
  it("shows the range as a button and picks a preset from its menu", () => {
    const { onPreset } = renderMenu();
    const trigger = screen.getByTestId("feed-date-trigger");
    expect(trigger).toHaveTextContent("Last 7 days");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByTestId("feed-date-7d")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByTestId("feed-date-90d"));
    expect(onPreset).toHaveBeenCalledWith("90d");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("applies a custom range of whole UTC days, further back than the timeline's 90", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
    const { onCustomRange } = renderMenu();
    fireEvent.click(screen.getByTestId("feed-date-trigger"));
    // Prefilled with the current range.
    expect(screen.getByTestId("feed-date-from")).toHaveValue("2026-11-18");
    expect(screen.getByTestId("feed-date-to")).toHaveValue("2026-11-25");

    fireEvent.change(screen.getByTestId("feed-date-from"), { target: { value: "2026-03-01" } });
    fireEvent.change(screen.getByTestId("feed-date-to"), { target: { value: "2026-04-15" } });
    fireEvent.click(screen.getByTestId("feed-date-apply"));
    expect(onCustomRange).toHaveBeenCalledWith({ from: "2026-03-01T00:00:00.000Z", to: "2026-04-15T23:59:59.999Z" });
  });

  it("won't apply an inverted or future range", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
    const { onCustomRange } = renderMenu();
    fireEvent.click(screen.getByTestId("feed-date-trigger"));
    fireEvent.change(screen.getByTestId("feed-date-from"), { target: { value: "2026-05-01" } });
    fireEvent.change(screen.getByTestId("feed-date-to"), { target: { value: "2026-04-15" } });
    expect(screen.getByTestId("feed-date-apply")).toBeDisabled();
    fireEvent.change(screen.getByTestId("feed-date-to"), { target: { value: "2026-12-15" } });
    expect(screen.getByTestId("feed-date-apply")).toBeDisabled();
    expect(onCustomRange).not.toHaveBeenCalled();
  });

  it("tells the timeline while it is pointed at or open, and marks itself while the timeline drags", () => {
    const { onActiveChange } = renderMenu({ linked: true, isDefault: false });
    const trigger = screen.getByTestId("feed-date-trigger");
    expect(trigger).toHaveAttribute("data-linked");
    expect(trigger).toHaveAttribute("data-active");
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
    fireEvent.pointerEnter(trigger);
    expect(onActiveChange).toHaveBeenLastCalledWith(true);
    fireEvent.pointerLeave(trigger);
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(trigger);
    expect(onActiveChange).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
  });
});
