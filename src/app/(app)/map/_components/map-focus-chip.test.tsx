import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MapFocusChip } from "./map-focus-chip";

const base = {
  label: "Explosions/Remote violence in Mayo",
  clearLabel: "Clear focus and show all map markers",
  maxWidth: 220,
};

describe("MapFocusChip", () => {
  afterEach(cleanup);

  it("links the label back to the detail page and leaves clearing to the X", () => {
    const onClear = vi.fn();
    render(
      <MapFocusChip
        {...base}
        detailHref="/signal/sig-1"
        detailLinkLabel="Open the signal page"
        onClear={onClear}
      />,
    );

    const link = screen.getByRole("link", { name: /Open the signal page/ });
    expect(link).toHaveAttribute("href", "/signal/sig-1");
    expect(link).toHaveTextContent(base.label);

    fireEvent.click(link);
    expect(onClear).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: base.clearLabel }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("clears on any click when there is no detail page (place focus)", () => {
    const onClear = vi.fn();
    render(<MapFocusChip {...base} detailHref={null} onClear={onClear} />);

    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByText(base.label));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
