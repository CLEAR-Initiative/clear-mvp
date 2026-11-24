import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const { PanelNav } = await import("./panel-nav");

afterEach(() => {
  cleanup();
});

function renderNav(point: [number, number] | null) {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  render(
    <MantineProvider>
      <NuqsTestingAdapter searchParams={{ center: "10,20", zoom: "6.5" }} onUrlUpdate={onUrlUpdate}>
        <PanelNav back={{ to: "layers", onBack: vi.fn() }} point={point} />
      </NuqsTestingAdapter>
    </MantineProvider>,
  );
  return onUrlUpdate;
}

describe("PanelNav", () => {
  it("centres the map on the selection at the current zoom", async () => {
    const onUrlUpdate = renderNav([33.31666, 19.53333]);

    fireEvent.click(screen.getByRole("button", { name: "showOnMap" }));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const params = onUrlUpdate.mock.calls.at(-1)?.[0].searchParams;
    expect(params?.get("center")).toBe("33.31666,19.53333");
    expect(params?.get("zoom")).toBe("6.5");
  });

  it("only offers the way back when the selection has no point on the map", () => {
    renderNav(null);

    expect(screen.getByRole("button", { name: "layers" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "showOnMap" })).not.toBeInTheDocument();
  });
});
