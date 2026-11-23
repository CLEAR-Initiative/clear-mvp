import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ number: String }),
}));

vi.mock("../layers/registry", () => ({
  LAYERS: { signals: { Legend: () => <p>signals legend</p> } },
  isLayerId: (id: string) => id === "signals",
}));

const { Legend } = await import("./index");

afterEach(() => {
  cleanup();
});

describe("Legend", () => {
  it("keeps a hidden layer listed so it can be shown again", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    render(
      <MantineProvider>
        <NuqsTestingAdapter
          searchParams={{ layers: JSON.stringify([{ id: "signals", visibility: false, opacity: 1 }]) }}
          onUrlUpdate={onUrlUpdate}
        >
          <Legend />
        </NuqsTestingAdapter>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "controls.legend" }));
    expect(screen.getByText("signals legend")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "showLayer" }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const layers = JSON.parse(onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("layers") ?? "null");
    expect(layers).toEqual([{ id: "signals", visibility: true, opacity: 1 }]);
  });
});
