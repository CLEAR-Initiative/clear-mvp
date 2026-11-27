import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const tree = [
  {
    id: "sd",
    name: "Sudan",
    states: [
      { id: "sd-kh", name: "Khartoum", districts: [] },
      { id: "sd-ks", name: "Kassala", districts: [] },
    ],
  },
  { id: "af", name: "Afghanistan", states: [{ id: "af-ka", name: "Kabul", districts: [] }] },
];

vi.mock("~/trpc/react", () => ({
  api: {
    locations: {
      tree: { useQuery: () => ({ data: tree, isPending: false, isError: false, error: null }) },
    },
  },
}));

vi.mock("~/providers/working-country-provider", () => ({
  useWorkingCountry: () => ({
    countries: [
      { id: "af", name: "Afghanistan" },
      { id: "sd", name: "Sudan" },
    ],
    countryId: "sd",
    countryName: "Sudan",
    hasCountryScope: true,
    scopeReady: true,
  }),
}));

const { PlaceHeader } = await import("./place-header");

// jsdom has no scrollIntoView, and the open Combobox dropdown calls it.
Element.prototype.scrollIntoView = () => undefined;

afterEach(() => {
  cleanup();
});

function renderHeader(searchParams: Record<string, string> = {}) {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const onPlaceChange = vi.fn();
  render(
    <MantineProvider>
      <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
        <PlaceHeader onPlaceChange={onPlaceChange} />
      </NuqsTestingAdapter>
    </MantineProvider>,
  );
  const lastParams = () => onUrlUpdate.mock.calls.at(-1)?.[0].searchParams;
  return { onUrlUpdate, onPlaceChange, lastParams };
}

async function pick(label: string, option: string) {
  const input = screen.getByLabelText(label);
  fireEvent.click(input);
  fireEvent.change(input, { target: { value: option.slice(0, 2) } });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

describe("PlaceHeader", () => {
  it("writes a picked state", async () => {
    const { lastParams, onPlaceChange } = renderHeader();

    expect(screen.getByRole("heading", { name: "Sudan" })).toBeTruthy();
    await pick("regionLabel", "Khartoum");

    await waitFor(() => expect(lastParams()?.get("place")).toBe("sd-kh"));
    expect(onPlaceChange).toHaveBeenCalledTimes(1);
  });

  it("writes global from the Global view chip", async () => {
    const { lastParams } = renderHeader({ place: "sd-kh" });

    fireEvent.click(screen.getByRole("button", { name: "globalView" }));

    await waitFor(() => expect(lastParams()?.get("place")).toBe("global"));
  });

  it("goes back to following the Working country when it is picked", async () => {
    const { lastParams } = renderHeader({ place: "global" });

    await pick("countryLabel", "Sudan");

    await waitFor(() => expect(lastParams()?.has("place")).toBe(false));
  });
});
