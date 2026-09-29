import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { CountryAnalysisEntry, CreatedAnalysis } from "~/server/api/routers/analysis";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, vars?: Record<string, unknown>) =>
    `${ns ? `${ns}.` : ""}${key}${vars ? `:${JSON.stringify(vars)}` : ""}`,
  useFormatter: () => ({ relativeTime: () => "2 days ago" }),
  useNow: () => new Date("2026-09-29T12:00:00Z"),
}));
vi.mock("next/dynamic", () => ({
  // The map stub clicks inside Sheikan's square, elsewhere in the country, or
  // outside it, when a pick handler is wired.
  default: () =>
    function MapStub({ onMapClick }: { onMapClick?: (p: { lng: number; lat: number }) => void }) {
      return onMapClick ? (
        <div data-testid="crisis-map">
          <button type="button" data-testid="map-click-sheikan" onClick={() => onMapClick({ lng: 30.5, lat: 13.5 })} />
          <button type="button" data-testid="map-click-country" onClick={() => onMapClick({ lng: 30.5, lat: 14.5 })} />
          <button type="button" data-testid="map-click-outside" onClick={() => onMapClick({ lng: 0.5, lat: 0.5 })} />
        </div>
      ) : (
        <div data-testid="crisis-map" />
      );
    },
}));
const showNotification = vi.fn();
vi.mock("@mantine/notifications", () => ({ notifications: { show: (n: unknown) => showNotification(n) } }));

const square = (x: number, y: number) => ({
  type: "Polygon",
  coordinates: [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]],
});
const states = [
  { id: "ks", name: "Kassala", geometry: square(36, 15) },
  { id: "nk", name: "North Kordofan", geometry: { type: "Polygon", coordinates: [[[30, 13], [32, 13], [32, 15], [30, 15], [30, 13]]] } },
];
const districts = [
  { id: "sheikan", name: "Sheikan", geometry: square(30, 13) },
  { id: "umrawaba", name: "Um Rawaba", geometry: square(31, 13) },
];
const setCadenceMutate = vi.fn();
let cadenceOpts: { onSuccess?: () => void; onError?: () => void } = {};
let cadencePending: { id: string; cadence: string } | null = null;
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ analysis: { scopes: { invalidate: vi.fn() } } }),
    analysis: {
      remove: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      setCadence: {
        useMutation: (opts: typeof cadenceOpts) => (
          (cadenceOpts = opts),
          { mutate: setCadenceMutate, isPending: !!cadencePending, variables: cadencePending ?? undefined }
        ),
      },
    },
    locations: {
      getAdminBoundaries: {
        useQuery: ({ level }: { level: number }) => ({ data: level === 1 ? states : districts, isLoading: false }),
      },
    },
  },
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
Element.prototype.scrollIntoView = () => undefined;

const { AnalysisHome } = await import("./analysis-home");

function created(overrides: Partial<CreatedAnalysis> & { id: string }): CreatedAnalysis {
  return {
    name: overrides.id,
    locationIds: [],
    eventTypes: [],
    needSectors: [],
    countryId: "sdn",
    windowStart: "2026-06-01T00:00:00Z",
    cadence: "weekly",
    enabled: true,
    createdAt: "2026-09-01T00:00:00Z",
    analysisId: null,
    generatedAt: null,
    ...overrides,
  } as CreatedAnalysis;
}

const onOpenCreated = vi.fn();
const onOpenCountry = vi.fn();
function renderHome({
  country = null,
  list = [],
  manage = true,
}: { country?: CountryAnalysisEntry | null; list?: CreatedAnalysis[]; manage?: boolean } = {}) {
  return render(
    <MantineProvider>
      <AnalysisHome
        countryId="sdn"
        countryName="Sudan"
        country={country}
        created={list}
        loading={false}
        canCreate={manage}
        canRemove={manage}
        selector={null}
        onOpenCountry={onOpenCountry}
        onOpenCreated={onOpenCreated}
        onNew={vi.fn()}
      />
    </MantineProvider>,
  );
}

async function pick(testId: string, label: string) {
  fireEvent.click(screen.getByTestId(testId));
  // The listbox stays mounted (hidden) after the first pick.
  fireEvent.click(await screen.findByRole("option", { name: label, hidden: true }));
}

beforeEach(() => {
  setCadenceMutate.mockReset();
  onOpenCreated.mockReset();
  onOpenCountry.mockReset();
  cadencePending = null;
  showNotification.mockReset();
});
afterEach(cleanup);

describe("AnalysisHome", () => {
  it("lists generating analyses first, then the most recently updated", () => {
    renderHome({
      list: [
        created({ id: "old", generatedAt: "2026-09-01T00:00:00Z" }),
        created({ id: "new", generatedAt: "2026-09-28T00:00:00Z" }),
        created({ id: "pending" }),
      ],
    });
    const order = screen.getAllByTestId(/^analysis-scope-(old|new|pending)$/).map((el) => el.dataset.testid);
    expect(order).toEqual(["analysis-scope-pending", "analysis-scope-new", "analysis-scope-old"]);
  });

  it("shows the country headline under the title when there is one", () => {
    const country = { id: "sdn", name: "Sudan", analysisId: "a1", generatedAt: "2026-09-27T00:00:00Z" };
    renderHome({ country: { ...country, headline: "Fighting displaced 20,000 people." } as CountryAnalysisEntry });
    expect(screen.getByTestId("analysis-scope-country-headline")).toHaveTextContent("Fighting displaced 20,000 people.");
    cleanup();
    renderHome({ country: { ...country, headline: null } as CountryAnalysisEntry });
    expect(screen.queryByTestId("analysis-scope-country-headline")).toBeNull();
  });

  it("changes the update frequency of a created analysis", async () => {
    renderHome({ list: [created({ id: "c1", generatedAt: "2026-09-28T00:00:00Z" })] });
    await pick("analysis-frequency-c1", "analysis.cadence.manual");
    expect(setCadenceMutate).toHaveBeenLastCalledWith({ id: "c1", cadence: "manual" });
    await pick("analysis-frequency-c1", "analysis.cadence.daily");
    expect(setCadenceMutate).toHaveBeenLastCalledWith({ id: "c1", cadence: "daily" });
    expect(onOpenCreated).not.toHaveBeenCalled();

    cadenceOpts.onError?.();
    expect(showNotification).toHaveBeenCalledWith({ color: "red", message: "analysis.home.frequencyError" });
  });

  it("shows the picked frequency and blocks another pick while it saves", () => {
    cadencePending = { id: "c1", cadence: "daily" };
    renderHome({ list: [created({ id: "c1" }), created({ id: "c2" })] });
    expect(screen.getByTestId("analysis-frequency-c1")).toHaveValue("analysis.cadence.daily");
    expect(screen.getByTestId("analysis-frequency-c1")).toBeDisabled();
    expect(screen.getByTestId("analysis-frequency-c2")).toHaveValue("analysis.cadence.weekly");
    expect(screen.getByTestId("analysis-frequency-c2")).toBeEnabled();
  });

  it("shows an analysis updated on request as such, never out of date", () => {
    renderHome({ list: [created({ id: "c1", enabled: false, generatedAt: "2026-01-01T00:00:00Z" })] });
    expect(screen.getByTestId("analysis-frequency-c1")).toHaveValue("analysis.cadence.manual");
    const row = screen.getByTestId("analysis-scope-c1");
    expect(within(row).getByText(/analysis\.home\.paused/)).toBeInTheDocument();
    expect(within(row).queryByText("analysis.home.stale")).toBeNull();
  });

  it("hides the frequency control from non-managers", () => {
    renderHome({ list: [created({ id: "c1" })], manage: false });
    expect(screen.queryByTestId("analysis-frequency-c1")).toBeNull();
  });

  it("opens the created analysis whose area is clicked on the map", () => {
    const kassala = created({ id: "kassala", locationIds: ["ks"] });
    const sheikan = created({ id: "sheikan", locationIds: ["umrawaba", "sheikan"] });
    renderHome({ list: [kassala, sheikan] });
    expect(screen.getByText("analysis.home.mapHint")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("map-click-sheikan"));
    expect(onOpenCreated).toHaveBeenCalledWith(sheikan);
    expect(onOpenCountry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("map-click-country"));
    expect(onOpenCountry).toHaveBeenCalledTimes(1);
  });

  it("opens the country analysis from a map click inside the country, even without created analyses", () => {
    renderHome();
    expect(screen.queryByText("analysis.home.mapHint")).toBeNull();
    fireEvent.click(screen.getByTestId("map-click-sheikan"));
    expect(onOpenCountry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("map-click-outside"));
    expect(onOpenCountry).toHaveBeenCalledTimes(1);
    expect(onOpenCreated).not.toHaveBeenCalled();
  });
});
