import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import { AddToCrisisRationaleModal } from "./add-to-crisis-rationale-modal";

afterEach(() => cleanup());

function renderModal(props: Partial<React.ComponentProps<typeof AddToCrisisRationaleModal>> = {}) {
  const onConfirm = vi.fn();
  const ui = (p: Partial<React.ComponentProps<typeof AddToCrisisRationaleModal>>) => (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>
        <AddToCrisisRationaleModal
          opened
          onClose={vi.fn()}
          crisisTitle="Khartoum floods"
          eventCount={2}
          pending={false}
          onConfirm={onConfirm}
          {...p}
        />
      </MantineProvider>
    </NextIntlClientProvider>
  );
  const utils = render(ui(props));
  return { onConfirm, rerender: (p: typeof props) => utils.rerender(ui({ ...props, ...p })) };
}

const confirmButton = () => screen.getByTestId("crisis-rationale-confirm");
const field = () => screen.getByTestId("crisis-rationale-input");

describe("AddToCrisisRationaleModal", () => {
  it("names the crisis and the number of events", () => {
    renderModal();
    expect(screen.getByText("Add 2 events to “Khartoum floods”.")).toBeTruthy();
  });

  it("cannot be confirmed while the rationale is blank or only spaces", () => {
    const { onConfirm } = renderModal();
    expect(confirmButton()).toHaveProperty("disabled", true);
    fireEvent.change(field(), { target: { value: "   " } });
    expect(confirmButton()).toHaveProperty("disabled", true);
    fireEvent.click(confirmButton());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("sends the trimmed rationale", () => {
    const { onConfirm } = renderModal();
    fireEvent.change(field(), { target: { value: "  Same flood wave  " } });
    fireEvent.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledWith("Same flood wave");
  });

  it("keeps the text and can be sent again after a failed request", () => {
    const { onConfirm, rerender } = renderModal();
    fireEvent.change(field(), { target: { value: "Same flood wave" } });
    rerender({ pending: true });
    expect(confirmButton()).toHaveProperty("disabled", true);
    // The request failed: the caller leaves the dialog open and clears pending.
    rerender({ pending: false });
    expect((field() as HTMLTextAreaElement).value).toBe("Same flood wave");
    fireEvent.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
