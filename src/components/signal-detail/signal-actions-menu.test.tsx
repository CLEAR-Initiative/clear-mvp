import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

/**
 * A Signal's ⋯ menu: Change location for readers who may file one (the
 * active team's analysts and platform admins), editing the open change when
 * there is one, and no menu for anyone else.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const { SignalActionsMenu } = await import("./signal-actions-menu");

function open(props: Partial<React.ComponentProps<typeof SignalActionsMenu>> = {}) {
  render(
    <MantineProvider>
      <SignalActionsMenu canChangeLocation hasOpenChange={false} onChangeLocation={() => {}} {...props} />
    </MantineProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("SignalActionsMenu", () => {
  it("offers Change location from the menu", async () => {
    const onChangeLocation = vi.fn();
    open({ onChangeLocation });
    fireEvent.click(screen.getByTestId("signal-actions-menu"));
    fireEvent.click(await screen.findByText("actions.changeLocation"));
    expect(onChangeLocation).toHaveBeenCalled();
  });

  it("edits the open change instead, when the Signal has one", async () => {
    open({ hasOpenChange: true });
    fireEvent.click(screen.getByTestId("signal-actions-menu"));
    expect(await screen.findByText("actions.editChange")).toBeTruthy();
    expect(screen.queryByText("actions.changeLocation")).toBeNull();
  });

  it("shows no menu to a reader who can't change the location", () => {
    open({ canChangeLocation: false });
    expect(screen.queryByTestId("signal-actions-menu")).toBeNull();
  });
});
