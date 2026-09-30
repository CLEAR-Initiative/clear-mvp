import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { Analysis } from "~/server/api/mappers/analysis";
import type { AnalysisEvents, AnalysisFigures, AnalysisScopes, CreatedAnalysis } from "~/server/api/mappers/analysis";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, vars?: Record<string, unknown>) =>
    `${ns ? `${ns}.` : ""}${key}${vars ? `:${JSON.stringify(vars)}` : ""}`,
  useFormatter: () => ({
    dateTime: () => "22 Sep 2026",
    relativeTime: () => "2 days ago",
    number: (n: number) => `${Math.round(n * 100)}%`,
  }),
  useNow: () => new Date("2026-09-29T12:00:00Z"),
  useLocale: () => locale,
}));
let locale = "en";
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));


const SUDAN = { id: "sdn", name: "Sudan", level: 0 };
const AFG = { id: "afg", name: "Afghanistan", level: 0 };
let team: { countries: { id: string; name: string; level: number }[]; countryId: string | null };
let allCountries: { id: string; name: string }[] = [];
vi.mock("~/hooks/use-team-country", () => ({
  useTeamCountry: () => ({ ...team, isLoading: false }),
}));
let role = "analyst";
let activeTeamId: string | null = "team-1";
vi.mock("~/providers/team-provider", () => ({ useTeam: () => ({ activeTeamId }) }));
vi.mock("next/dynamic", () => ({
  // The map stub clicks inside Sheikan's square when a pick handler is wired.
  default: () =>
    function MapStub({ onMapClick }: { onMapClick?: (p: { lng: number; lat: number }) => void }) {
      return onMapClick ? (
        <button type="button" data-testid="map-click-sheikan" onClick={() => onMapClick({ lng: 30.5, lat: 13.5 })} />
      ) : (
        <div data-testid="crisis-map" />
      );
    },
}));
vi.mock("~/components/map/minimap-card", () => ({
  MinimapCard: ({ markers }: { markers: unknown[] }) => <div data-testid="minimap">{markers.length} markers</div>,
}));

let analysisResult: { data: Analysis | null | undefined; isLoading: boolean; isError: boolean };
let eventsResult: { data: AnalysisEvents | undefined };
let figuresResult: AnalysisFigures | undefined;
let scopesResult: AnalysisScopes;
let frameResult: { data: Analysis | null | undefined; isLoading: boolean; isError: boolean };
const currentQuery = vi.fn();
const frameQuery = vi.fn();
const scopesQuery = vi.fn();
const eventsQuery = vi.fn();
const createMutate = vi.fn();
let createOpts: { onSuccess?: (res: unknown, input: unknown) => Promise<void> | void } = {};
const showNotification = vi.fn();
vi.mock("@mantine/notifications", () => ({ notifications: { show: (n: unknown) => showNotification(n) } }));
const removeMutate = vi.fn();
const square = (x: number, y: number) => ({
  type: "Polygon",
  coordinates: [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]],
});
const states = [
  { id: "nk", name: "North Kordofan", parent: { id: "sdn", name: "Sudan" }, geometry: null },
  { id: "ks", name: "Kassala", parent: { id: "sdn", name: "Sudan" }, geometry: null },
];
const districts = [
  { id: "sheikan", name: "Sheikan", parent: { id: "nk", name: "North Kordofan" }, geometry: square(30, 13) },
  { id: "umrawaba", name: "Um Rawaba", parent: { id: "nk", name: "North Kordofan" }, geometry: square(31, 13) },
  { id: "kassala-town", name: "Kassala Town", parent: { id: "ks", name: "Kassala" }, geometry: square(36, 15) },
];
const mutation = (mutate: typeof createMutate) => ({ mutate, reset: vi.fn(), isPending: false, isError: false });
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      analysis: { scopes: { invalidate: vi.fn() } },
      locations: { getById: { fetch: async () => ({ geometry: null }) } },
    }),
    // ScopeMap loads each created area's geometry.
    useQueries: (build: (q: { locations: { getById: (input: { id: string }) => unknown } }) => unknown[]) =>
      build({ locations: { getById: () => null } }).map(() => ({ data: { geometry: null } })),
    auth: { me: { useQuery: () => ({ data: { user: { role } } }) } },
    analysis: {
      scopes: {
        useQuery: (input: unknown, opts: { enabled?: boolean }) => (
          scopesQuery(input, opts), { data: opts.enabled ? scopesResult : undefined, isLoading: false, isFetching: false }
        ),
      },
      current: {
        useQuery: (input: unknown, opts: { enabled?: boolean }) => (
          currentQuery(input, opts), opts.enabled ? analysisResult : { data: undefined, isLoading: false, isError: false }
        ),
      },
      forFrame: {
        useQuery: (input: unknown, opts: { enabled?: boolean }) => (
          frameQuery(input, opts), opts.enabled ? frameResult : { data: undefined, isLoading: false, isError: false }
        ),
      },
      events: { useQuery: (input: unknown) => (eventsQuery(input), eventsResult) },
      figures: { useQuery: () => ({ data: figuresResult }) },
      create: { useMutation: (opts: typeof createOpts) => ((createOpts = opts), mutation(createMutate)) },
      remove: { useMutation: () => mutation(removeMutate) },
      refresh: { useMutation: () => mutation(vi.fn()) },
      setCadence: { useMutation: () => mutation(vi.fn()) },
    },
    locations: {
      getById: { useQuery: () => ({ data: { geometry: null } }) },
      getAdminBoundaries: {
        useQuery: ({ level }: { level: number }) => ({ data: level === 1 ? states : districts, isLoading: false }),
      },
    },
    situationAnalysis: { countries: { useQuery: () => ({ data: allCountries, isLoading: false }) } },
  },
}));

const pdfSections = vi.fn();
vi.mock("@react-pdf/renderer", () => ({
  pdf: (el: { props: { sections: string[] } }) => (
    pdfSections(el.props.sections), { toBlob: async () => new Blob(["%PDF-"]) }
  ),
}));
vi.mock("./report/report-document", () => ({ ReportDocument: () => null }));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const { AnalysisTab } = await import("./analysis-tab");

function analysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    id: "a1",
    scope: { locationIds: ["sdn"], name: "Sudan", windowStart: "2026-01-01T00:00:00Z", windowEnd: "2026-12-31T23:59:59Z" },
    crisis: {
      country: "Sudan",
      year: "2026",
      generatedAt: "2026-09-27T06:00:00Z",
      generatedByModel: "claude-sonnet-4-6",
      schemaVersion: "v4",
      reportCount: 4,
      qualityScore: 0.7,
      freshestSourceAt: "2026-09-22T00:00:00Z",
    },
    summary: "Sudan's war is driving the largest displacement crisis.",
    summaryRefs: [1, 2],
    summaryLineRefs: {},
    stats: [
      { key: "displaced", value: "8.6M", range: null, confidence: null },
      { key: "inNeed", value: "33.7M", range: "19M – 33.7M", confidence: null },
    ],
    figures: { displaced: 8.6e6, affected: null, inNeed: 33.7e6, returnees: null, fundingRequired: 3e9, fundingReceived: 1.2e9 },
    contextRisks: [
      { key: "economy", label: "Economy", items: ["Currency collapse."], refs: [1], lineRefs: {} },
      { key: "security", label: "Security", items: ["Drone strikes on markets.", "Frontlines active."], refs: [], lineRefs: {} },
    ],
    hazards: { hazards: [{ text: "Cholera outbreak.", refs: [2] }], vulnerabilities: [] },
    displacement: { push: [{ text: "Conflict drives movement.", refs: [] }], return: [] },
    sectors: [
      {
        id: "health",
        code: "HE",
        name: "Health",
        severity: "critical",
        impact: ["Hospitals struck."],
        humanitarian: [],
        atRisk: [],
        needs: [],
        interventions: [],
        coverage: [],
        refs: [],
        lineRefs: {},
        reportCount: 2,
        evidenceScope: "sector",
      },
    ],
    sources: [
      { id: "r1", title: "OCHA update", url: "https://rw/1", publishedAt: null, publisher: "OCHA" },
      { id: "event:e1", title: "Shelling", url: "/event/e1", publishedAt: null, publisher: "CLEAR" },
    ],
    changes: { comparedTo: null, notes: {} },
    scenarios: { description: null, mostLikely: "Fighting continues.", bestCase: null, worstCase: null, refs: [2] },
    eventSourceIds: ["event:e1"],
    keyFindings: [],
    ...overrides,
  };
}

const events: AnalysisEvents = {
  totalCount: 1,
  items: [
    {
      id: "e1",
      title: "Shelling in El Fasher",
      types: ["conflict"],
      severity: 5,
      startedAt: "2026-09-20T00:00:00Z",
      lastSignalAt: "2026-09-21T00:00:00Z",
      casualties: null,
      populationDisplaced: null,
      point: [25.3, 13.6],
      locationName: "El Fasher",
      admin1: { id: "nd", name: "North Darfur" },
    },
  ],
};

const created = (overrides: Partial<CreatedAnalysis> = {}): CreatedAnalysis => ({
  id: "auto-1",
  name: "Sheikan, North Kordofan, Sudan",
  locationIds: ["sheikan"],
  eventTypes: [],
  needSectors: [],
  countryId: "sdn",
  windowStart: "2026-07-01T00:00:00.000Z",
  cadence: "weekly",
  enabled: true,
  createdAt: "2026-09-28T00:00:00.000Z",
  analysisId: "a2",
  generatedAt: "2026-09-28T08:00:00.000Z",
  ...overrides,
});

const renderHome = () => render(<MantineProvider><AnalysisTab /></MantineProvider>);
/** Lands on the analyses list, then opens the country analysis. */
const renderPage = () => {
  const r = renderHome();
  fireEvent.click(within(screen.getByTestId("analysis-scope-country")).getAllByRole("button")[0]!);
  return r;
};

beforeEach(() => {
  locale = "en";
  role = "analyst";
  activeTeamId = "team-1";
  scopesResult = {
    countries: [{ id: "sdn", name: "Sudan", analysisId: "a1", generatedAt: "2026-09-27T06:00:00Z", headline: null }],
    created: [],
  };
  frameResult = { data: undefined, isLoading: false, isError: false };
  team = { countries: [SUDAN], countryId: "sdn" };
  allCountries = [];
  analysisResult = { data: analysis(), isLoading: false, isError: false };
  eventsResult = { data: events };
  figuresResult = {
    idpStock: { value: 8.6e6, low: null, high: null, newestAt: "2026-08-31" },
    refugees: { value: 2.8e6, low: null, high: null, newestAt: "2026-08-15" },
    returneeStock: null,
    overallPin: { value: 33.7e6, low: 19e6, high: 33.7e6, newestAt: "2026-09-01" },
    pinBySector: [
      { sector: "wash", figure: { value: 25.5e6, low: null, high: null, newestAt: null } },
      { sector: "health", figure: { value: 20.3e6, low: null, high: null, newestAt: null } },
    ],
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Insights > Analysis tab", () => {
  it("scopes to the team's working country and renders every overview section", () => {
    renderPage();
    expect(currentQuery).toHaveBeenCalledWith(
      { countryLocationId: "sdn", countryName: "Sudan" },
      expect.objectContaining({ enabled: true }),
    );
    expect(screen.getByRole("heading", { name: "Sudan" })).toBeInTheDocument();
    expect(screen.getByTestId("analysis-meta")).toHaveTextContent('analysis.meta.builtFrom:{"reports":1,"events":1}');
    expect(screen.getByText(/largest displacement crisis/)).toBeInTheDocument();
    // Displaced = inside + abroad, split in the legend.
    expect(screen.getByText("11.4M")).toBeInTheDocument();
    expect(screen.getByText('analysis.kpis.inside:{"scope":"Sudan"}')).toBeInTheDocument();
    expect(screen.getByText("2.8M")).toBeInTheDocument();
    // In need: headline, range and sectors.
    expect(screen.getByText("19M – 33.7M")).toBeInTheDocument();
    expect(screen.getByText("analysis.kpis.sectors.wash")).toBeInTheDocument();
    expect(screen.getByText("25.5M")).toBeInTheDocument();
    // Funding from the analysis window.
    expect(screen.getAllByText("$1.2B").length).toBeGreaterThan(0);
    expect(screen.getByTestId("minimap")).toHaveTextContent("1 markers");
    expect(screen.getByText("North Darfur")).toBeInTheDocument();
    // Country scope: no event timeline.
    expect(screen.queryByTestId("analysis-section-timeline")).not.toBeInTheDocument();
    expect(screen.getByText("Cholera outbreak.")).toBeInTheDocument();
    expect(screen.getByText("Fighting continues.")).toBeInTheDocument();
  });

  it("collapses Contexts, Hazards & Vulnerabilities, Displacement and Forecast by default", () => {
    renderPage();
    for (const id of ["contexts", "hazards", "displacement", "forecast"]) {
      const toggle = within(screen.getByTestId(`analysis-section-${id}`)).getAllByRole("button")[0]!;
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
    }
    expect(screen.getByText("analysis.contexts.title")).toBeInTheDocument();
  });

  it("shows the summary's first two sentences until the reader expands it", () => {
    analysisResult = {
      data: analysis({ summary: "First point. Second point. Third point. Fourth point." }),
      isLoading: false,
      isError: false,
    };
    renderPage();
    expect(screen.getByText(/First point\. Second point\./)).toBeInTheDocument();
    expect(screen.queryByText(/Third point/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("summary-toggle"));
    expect(screen.getByText(/Third point\. Fourth point\./)).toBeInTheDocument();
  });

  it("switches context categories", () => {
    renderPage();
    expect(screen.getByText("Currency collapse.")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("analysis-risk-security"));
    expect(screen.getByText("Drone strikes on markets.")).toBeInTheDocument();
    expect(screen.queryByText("Currency collapse.")).not.toBeInTheDocument();
  });

  it("shows the needs table from the analysis sectors, most severe first, with sector findings on expand", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "analysis.tabs.needs" }));
    const health = screen.getByText("crisisDetail.needs.sectors.health");
    expect(screen.getAllByText(/crisisDetail\.needs\.sectors\./)[0]).toBe(health);
    expect(screen.getByText("common.severities.critical")).toBeInTheDocument();
    fireEvent.click(health);
    expect(screen.getByText("Hospitals struck.")).toBeInTheDocument();
  });

  it("lists cited sources and the scope's events on the sources tab", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "analysis.tabs.sources" }));
    expect(screen.getByText("OCHA update")).toBeInTheDocument();
    const row = screen.getByTestId("analysis-event-row");
    expect(row).toHaveAttribute("href", "/event/e1");
    expect(within(row).getByText("Shelling in El Fasher")).toBeInTheDocument();
  });

  it("defaults a multi-country team with no working country to Sudan and offers a picker", () => {
    team = { countries: [AFG, SUDAN], countryId: null };
    renderHome();
    expect(scopesQuery).toHaveBeenLastCalledWith(
      { teamId: "team-1", countries: [{ id: "sdn", name: "Sudan" }] },
      expect.objectContaining({ enabled: true }),
    );
    expect(screen.getByTestId("analysis-country")).toHaveValue("Sudan");
    fireEvent.click(within(screen.getByTestId("analysis-scope-country")).getAllByRole("button")[0]!);
    expect(currentQuery).toHaveBeenLastCalledWith(
      { countryLocationId: "sdn", countryName: "Sudan" },
      expect.objectContaining({ enabled: true }),
    );
  });

  it("offers every country to an unscoped team, still defaulting to Sudan", () => {
    team = { countries: [], countryId: null };
    allCountries = [AFG, SUDAN];
    renderPage();
    expect(currentQuery).toHaveBeenLastCalledWith(
      { countryLocationId: "sdn", countryName: "Sudan" },
      expect.anything(),
    );
  });

  it("explains when there is no country to analyse", () => {
    team = { countries: [], countryId: null };
    renderHome();
    expect(screen.getByText("analysis.noCountry")).toBeInTheDocument();
  });

  it("shows the empty state when no analysis exists for the scope", () => {
    analysisResult = { data: null, isLoading: false, isError: false };
    renderPage();
    expect(screen.getByText("analysis.empty.title")).toBeInTheDocument();
  });

  it("lands on the analyses list: the country analysis and the team's created ones in that country", () => {
    scopesResult.created = [
      created(),
      // Created minutes ago, so still within the generation window.
      created({ id: "auto-2", name: "Kassala, Kassala, Sudan", generatedAt: null, analysisId: null, createdAt: "2026-09-29T11:50:00.000Z" }),
      created({ id: "auto-3", name: "Old one, Sudan", generatedAt: "2026-09-01T00:00:00Z" }),
      created({ id: "auto-4", name: "Kabul, Afghanistan", countryId: "afg" }),
    ];
    renderHome();
    expect(screen.getByText("analysis.home.title")).toBeInTheDocument();
    expect(within(screen.getByTestId("analysis-scope-country")).getByText("Sudan")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-scope-auto-1")).toHaveTextContent("Sheikan, North Kordofan, Sudan");
    expect(screen.getByTestId("analysis-scope-auto-2")).toHaveTextContent("analysis.home.generating");
    expect(screen.getByTestId("analysis-scope-auto-3")).toHaveTextContent("analysis.home.stale");
    expect(screen.getByTestId("analysis-scope-auto-1")).not.toHaveTextContent("analysis.home.stale");
    // Another country's analysis stays off this country's list.
    expect(screen.queryByTestId("analysis-scope-auto-4")).not.toBeInTheDocument();
    // No payload loads until one is opened.
    expect(currentQuery).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: true }));
  });

  it("opens a created analysis by its rolling frame, shows its timeline, and goes back to the list", () => {
    scopesResult.created = [created({ locationIds: ["sheikan", "umrawaba"], name: "Sheikan and Um Rawaba, North Kordofan, Sudan" })];
    frameResult = {
      data: analysis({ scope: { locationIds: ["sheikan", "umrawaba"], name: "x", windowStart: "2026-07-01T00:00:00.000Z", windowEnd: null } }),
      isLoading: false,
      isError: false,
    };
    renderHome();
    fireEvent.click(within(screen.getByTestId("analysis-scope-auto-1")).getAllByRole("button")[0]!);
    expect(frameQuery).toHaveBeenLastCalledWith(
      {
        locationIds: ["sheikan", "umrawaba"],
        eventTypes: [],
        needSectors: [],
        windowStart: "2026-07-01T00:00:00.000Z",
        name: "Sheikan and Um Rawaba, North Kordofan, Sudan",
      },
      expect.objectContaining({ enabled: true }),
    );
    expect(screen.getByRole("heading", { name: "Sheikan and Um Rawaba, North Kordofan, Sudan" })).toBeInTheDocument();
    expect(screen.getByText("analysis.scope.created")).toBeInTheDocument();
    expect(eventsQuery).toHaveBeenLastCalledWith({ locationIds: ["sheikan", "umrawaba"], from: "2026-07-01T00:00:00.000Z" });
    expect(screen.getByTestId("analysis-section-timeline")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("analysis-back"));
    expect(screen.getByText("analysis.home.title")).toBeInTheDocument();
  });

  it("shows the generating state until the first version of a created analysis lands", () => {
    scopesResult.created = [created({ generatedAt: null, analysisId: null, createdAt: "2026-09-29T11:50:00.000Z" })];
    frameResult = { data: null, isLoading: false, isError: false };
    renderHome();
    fireEvent.click(within(screen.getByTestId("analysis-scope-auto-1")).getAllByRole("button")[0]!);
    expect(screen.getByTestId("analysis-generating")).toHaveTextContent("analysis.generating.title");
  });

  it("hides create and remove from viewers", () => {
    role = "viewer";
    scopesResult.created = [created()];
    renderHome();
    expect(screen.queryByTestId("analysis-new")).not.toBeInTheDocument();
    expect(screen.queryByTestId("analysis-remove")).not.toBeInTheDocument();
  });

  it("removes a created analysis only after confirming", () => {
    scopesResult.created = [created()];
    renderHome();
    fireEvent.click(screen.getByTestId("analysis-remove"));
    expect(removeMutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("analysis-remove-confirm"));
    expect(removeMutate).toHaveBeenCalledWith({ id: "auto-1", teamId: "team-1" });
  });

  it("lists an analysis whose country could not be looked up under every country", () => {
    team = { countries: [AFG, SUDAN], countryId: "afg" };
    scopesResult.created = [created({ id: "auto-x", countryId: null }), created({ id: "auto-4", countryId: "afg" })];
    renderHome();
    expect(screen.getByTestId("analysis-scope-auto-x")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-scope-auto-4")).toBeInTheDocument();
    cleanup();
    team = { countries: [AFG, SUDAN], countryId: "sdn" };
    renderHome();
    expect(screen.getByTestId("analysis-scope-auto-x")).toBeInTheDocument();
    expect(screen.queryByTestId("analysis-scope-auto-4")).not.toBeInTheDocument();
  });

  const option = { selector: "[role=option] *, [role=option]" };
  const openCreate = async () => {
    renderHome();
    fireEvent.click(screen.getByTestId("analysis-new"));
    const search = await screen.findByTestId("analysis-create-search");
    fireEvent.click(search);
    return search;
  };

  // The home map behind the modal takes clicks too; click the one in the modal.
  const modalMapClick = () => fireEvent.click(within(screen.getByRole("dialog")).getByTestId("map-click-sheikan"));

  it("adds districts from the search box and the map as removable pills, then creates", async () => {
    const search = await openCreate();
    expect(screen.getByTestId("analysis-create-submit")).toBeDisabled();
    fireEvent.change(search, { target: { value: "um" } });
    expect(screen.queryByText("Sheikan", option)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByText("Um Rawaba", option));
    modalMapClick();
    expect(screen.getByTestId("analysis-create-pills")).toHaveTextContent("Um Rawaba, North Kordofan");
    expect(screen.getByTestId("analysis-create-pills")).toHaveTextContent("Sheikan, North Kordofan");
    expect(screen.getByTestId("analysis-create-summary")).toHaveTextContent("Um Rawaba and Sheikan, North Kordofan, Sudan");
    // A second map click on the same district takes it out again.
    modalMapClick();
    expect(screen.queryByTestId("analysis-create-pill-sheikan")).not.toBeInTheDocument();
    modalMapClick();
    // The pill's x removes it too.
    fireEvent.click(screen.getByLabelText('analysis.create.removeArea:{"name":"Um Rawaba"}'));
    expect(screen.queryByTestId("analysis-create-pill-umrawaba")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("analysis.cadence.daily"));
    fireEvent.click(screen.getByTestId("analysis-create-submit"));
    expect(createMutate).toHaveBeenCalledWith({ teamId: "team-1", locationIds: ["sheikan"], cadence: "daily" });
    await createOpts.onSuccess?.({ id: "auto-9", firstVersionRequested: true, existing: false, cadence: "daily" }, {});
    expect(showNotification).not.toHaveBeenCalled();
  });

  it("tells the user when the team already had the analysis and opens that one", async () => {
    await openCreate();
    await createOpts.onSuccess?.(
      { id: "auto-1", firstVersionRequested: false, existing: true, cadence: "weekly" },
      { teamId: "team-1", locationIds: ["sheikan"], cadence: "weekly" },
    );
    expect(showNotification).toHaveBeenCalledWith({ message: "analysis.create.existing" });
    expect(showNotification).toHaveBeenCalledTimes(1);
  });

  it("warns when an on-request analysis fell back to weekly because its first version could not be requested", async () => {
    await openCreate();
    await createOpts.onSuccess?.(
      { id: "auto-9", firstVersionRequested: false, existing: false, cadence: "weekly" },
      { teamId: "team-1", locationIds: ["sheikan"], cadence: "manual" },
    );
    expect(showNotification).toHaveBeenCalledWith({ color: "yellow", message: "analysis.create.manualFallback" });
  });

  it("lets a whole state replace its districts in the selection", async () => {
    const search = await openCreate();
    fireEvent.click(await screen.findByText("Sheikan", option));
    fireEvent.click(search);
    // The dropdown is mid-transition in jsdom, so its options are not yet "accessible".
    const options = await screen.findAllByRole("option", { hidden: true });
    fireEvent.click(options.find((o) => o.textContent === "North Kordofan")!);
    const pills = screen.getByTestId("analysis-create-pills");
    expect(pills).toHaveTextContent('analysis.create.wholeState:{"name":"North Kordofan"}');
    expect(screen.queryByTestId("analysis-create-pill-sheikan")).not.toBeInTheDocument();
    // Its districts are covered, so the search no longer offers them.
    fireEvent.click(search);
    expect(screen.queryByText("Um Rawaba", option)).not.toBeInTheDocument();
    expect(await screen.findByText("Kassala Town", option)).toBeInTheDocument();
  });

  it("points to the existing analysis instead of creating a duplicate", async () => {
    scopesResult.created = [created()];
    await openCreate();
    fireEvent.click(await screen.findByText("Sheikan", option));
    expect(screen.getByTestId("analysis-create-duplicate")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-create-submit")).toBeDisabled();
  });

  it("renders key findings with the subject in bold", () => {
    analysisResult = {
      data: analysis({ keyFindings: [{ text: "Security: Drone strikes hit El Obeid on 25 Sep.", refs: [2] }] }),
      isLoading: false,
      isError: false,
    };
    renderPage();
    const findings = screen.getByTestId("analysis-key-findings");
    expect(within(findings).getByText("Security:").tagName).toBe("SPAN");
    expect(findings).toHaveTextContent("Drone strikes hit El Obeid on 25 Sep.");
  });

  it("offers Create report on an opened analysis instead of the model name and switcher", () => {
    renderPage();
    expect(screen.getByTestId("analysis-create-report")).toBeEnabled();
    expect(screen.queryByTestId("analysis-switch")).not.toBeInTheDocument();
    expect(screen.getByTestId("analysis-meta")).not.toHaveTextContent("claude-sonnet-4-6");
  });

  it("disables Create report in Arabic, which the PDF can't set", () => {
    locale = "ar";
    renderPage();
    expect(screen.getByTestId("analysis-create-report")).toBeDisabled();
  });

  it("builds the report from the sections the reader keeps, in their order", async () => {
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderPage();
    fireEvent.click(screen.getByTestId("analysis-create-report"));
    const list = await screen.findByTestId("report-builder-list");
    const keys = within(list)
      .getAllByTestId(/^report-section-/)
      .map((el) => el.getAttribute("data-testid")!.replace("report-section-", ""));
    expect(keys[0]).toBe("keyDevelopments");
    expect(keys.at(-1)).toBe("sources");
    // Nothing to report: shown, but can't be ticked.
    expect(screen.getByTestId("report-include-responseActivities")).toBeDisabled();
    fireEvent.click(screen.getByTestId("report-include-contexts"));
    fireEvent.click(screen.getByTestId("report-builder-create"));
    await vi.waitFor(() => expect(pdfSections).toHaveBeenCalled());
    const sections = pdfSections.mock.calls[0]![0] as string[];
    expect(sections).not.toContain("contexts");
    expect(sections).not.toContain("responseActivities");
    expect(sections.slice(0, 3)).toEqual(["keyDevelopments", "currentStatus", "map"]);
    await vi.waitFor(() => expect(click).toHaveBeenCalled());
    click.mockRestore();
  });
});
