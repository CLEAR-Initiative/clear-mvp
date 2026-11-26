import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const { MapSettingsPanel } = await import("./map-settings");

afterEach(() => {
  cleanup();
});

describe("MapSettingsPanel", () => {
  it("writes the chosen level to the URL and clears it for State", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    render(
      <MantineProvider>
        <NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
          <MapSettingsPanel />
        </NuqsTestingAdapter>
      </MantineProvider>,
    );

    expect(screen.getByRole("radio", { name: "boundaries.state" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "boundaries.districts" }));
    await waitFor(() => expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe("?boundaries=districts"));

    fireEvent.click(screen.getByRole("radio", { name: "boundaries.state" }));
    await waitFor(() => expect(onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.has("boundaries")).toBe(false));
  });
});
