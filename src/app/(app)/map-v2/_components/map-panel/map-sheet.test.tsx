import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const { MapSheet } = await import("./map-sheet");
const { useMapSheet, usePeekTitle } = await import("./sheet-context");

afterEach(() => {
  cleanup();
});

function TitledView({ title }: { title: string }) {
  usePeekTitle(title);
  const sheet = useMapSheet();
  return (
    <button type="button" onClick={sheet?.close}>
      {title} close
    </button>
  );
}

function renderSheet({ expanded, children }: { expanded: boolean; children?: React.ReactNode }) {
  const onExpandedChange = vi.fn<(expanded: boolean) => void>();
  const onClose = vi.fn();
  const { container } = render(
    <MantineProvider>
      <MapSheet expanded={expanded} onExpandedChange={onExpandedChange} onClose={onClose}>
        {children}
      </MapSheet>
    </MantineProvider>,
  );
  return { container, onExpandedChange, onClose };
}

describe("MapSheet", () => {
  it("names the view in the peek and raises the sheet from it", () => {
    const { onExpandedChange } = renderSheet({ expanded: false, children: <TitledView title="3 signals" /> });

    const peek = screen.getByRole("button", { name: "expand" });
    expect(peek).toHaveTextContent("3 signals");
    expect(peek).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(peek);
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  it("keeps the view out of reach while the sheet is lowered", () => {
    const { container } = renderSheet({ expanded: false, children: <TitledView title="3 signals" /> });

    expect(container.querySelector("#map-sheet-body")).toHaveAttribute("inert");
  });

  it("shows an empty peek when nothing is selected", () => {
    renderSheet({ expanded: false });

    expect(screen.getByRole("button", { name: "expand" })).toHaveTextContent("");
  });

  it("lowers the raised sheet from its handle or the dimmed map", () => {
    const { container, onExpandedChange } = renderSheet({
      expanded: true,
      children: <TitledView title="3 signals" />,
    });

    expect(container.querySelector("#map-sheet-body")).not.toHaveAttribute("inert");

    fireEvent.click(screen.getByRole("button", { name: "collapse" }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);

    onExpandedChange.mockClear();
    const backdrop = container.querySelector('[data-visible="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("clears the selection and lowers itself when a view closes", () => {
    const { onExpandedChange, onClose } = renderSheet({ expanded: true, children: <TitledView title="3 signals" /> });

    fireEvent.click(screen.getByRole("button", { name: "3 signals close" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });
});
