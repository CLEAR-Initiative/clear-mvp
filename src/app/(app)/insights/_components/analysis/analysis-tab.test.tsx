import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { Analysis } from "~/server/api/mappers/analysis";
import { REPORT_BUILD_TIMEOUT_MS } from "~/lib/analysis-report";
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

/** The Insights page URL. Empty is the list. `replace` applies it, as the router would. */
let search = "";
const replace = vi.fn((href: string) => {
  const q = href.indexOf("?");
  search = q === -1 ? "" : href.slice(q + 1);
});
vi.mock("next/navigation", () => ({
  usePathname: () => "/insights",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
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
let scopesError = false;
let countriesError = false;
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
    auth: { me: { useQuery: () => ({ data: { user: { id: "user-1", role: role === "admin" ? "admin" : "member", teamMemberships: role === "analyst" ? [{ role: "analyst" }] : [] } } }) } },
    analysis: {
      scopes: {
        useQuery: (input: unknown, opts: { enabled?: boolean }) => (
          scopesQuery(input, opts),
          {
            data: opts.enabled && !scopesError ? scopesResult : undefined,
            isLoading: false,
            isFetching: false,
            isError: !!opts.enabled && scopesError,
          }
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
      thread: {
        useQuery: () => ({
          data: undefined,
          isSuccess: false,
          isError: false,
          isLoading: false,
          refetch: async () => ({ data: undefined }),
        }),
      },
      rename: { useMutation: () => mutation(vi.fn()) },
      comment: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
    locations: {
      getById: { useQuery: () => ({ data: { geometry: null } }) },
      getAdminBoundaries: {
        useQuery: ({ level }: { level: number }) => ({ data: level === 1 ? states : districts, isLoading: false }),
      },
    },
    situationAnalysis: {
      countries: {
        useQuery: () => ({
          data: countriesError ? undefined : allCountries,
          isLoading: false,
          isError: countriesError,
        }),
      },
    },
  },
}));

const pdfSections = vi.fn();
const pdfToBlob = vi.fn(async () => new Blob(["%PDF-"]));
vi.mock("@react-pdf/renderer", () => ({
  pdf: (el: { props: { sections: string[] } }) => (
    pdfSections(el.props.sections), { toBlob: () => pdfToBlob() }
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
      { key: "displaced", value: "8.6M", range: null, confidence: null, periodYear: null },
      { key: "inNeed", value: "33.7M", range: "19M – 33.7M", confidence: null, periodYear: null },
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
  search = "";
  replace.mockClear();
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
  scopesError = false;
  countriesError = false;
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
  vi.useRealTimers();
  pdfToBlob.mockImplementation(async () => new Blob(["%PDF-"]));
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
    expect(screen.getByText(/analysis\.kpis\.inside:\{"scope":"Sudan"\}/)).toBeInTheDocument();
    expect(screen.getByText(/2\.8M/)).toBeInTheDocument();
    // In need: headline, range and sectors.
    expect(screen.getByText(/19M – 33\.7M/)).toBeInTheDocument();
    expect(screen.getByText("analysis.kpis.sectors.wash")).toBeInTheDocument();
    expect(screen.getByText("25.5M")).toBeInTheDocument();
    // Funding from the analysis window.
    expect(screen.getAllByText(/\$1\.2B/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("minimap")).toHaveTextContent("1 markers");
    expect(screen.getByText("North Darfur")).toBeInTheDocument();
    // Country scope: no event timeline. Forecasts stay off the overview.
    expect(screen.queryByTestId("analysis-section-timeline")).not.toBeInTheDocument();
    expect(screen.queryByTestId("analysis-section-forecast")).not.toBeInTheDocument();
    expect(screen.queryByText("Fighting continues.")).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId("analysis-section-hazards")).getAllByRole("button")[0]!);
    expect(screen.getByText("Cholera outbreak.")).toBeInTheDocument();
  });

  it("opens context and keeps hazards and displacement collapsed", () => {
    renderPage();
    expect(screen.queryByTestId("analysis-section-forecast")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("analysis-section-contexts")).getAllByRole("button")[0]).toHaveAttribute("aria-expanded", "true");
    for (const id of ["hazards", "displacement"]) {
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
    expect(screen.getByTestId("analysis-sectors-card")).toHaveAttribute("data-surface", "context-card");
    fireEvent.click(health);
    expect(screen.getByText("Hospitals struck.")).toBeInTheDocument();
  });

  it("lists cited sources and the scope's events on the sources tab", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "analysis.tabs.sources" }));
    expect(screen.getByText("OCHA update")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-sources")).toHaveAttribute("data-surface", "card");
    expect(screen.getByTestId("analysis-events")).toHaveAttribute("data-surface", "page");
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
    expect(screen.queryByText("analysis.error")).not.toBeInTheDocument();
  });

  it("shows an error when the country list fails, not the no-country empty state", () => {
    team = { countries: [], countryId: null };
    countriesError = true;
    renderHome();
    expect(screen.getByText("analysis.error")).toBeInTheDocument();
    expect(screen.queryByText("analysis.noCountry")).not.toBeInTheDocument();
  });

  it("shows the empty created list only after the scopes request succeeds", () => {
    renderHome();
    expect(screen.getByTestId("analysis-created-empty")).toBeInTheDocument();
    expect(screen.queryByText("analysis.error")).not.toBeInTheDocument();
  });

  it("shows an error when the scopes list fails, not an empty created list", () => {
    scopesError = true;
    renderHome();
    expect(screen.getByText("analysis.error")).toBeInTheDocument();
    expect(screen.queryByTestId("analysis-created-empty")).not.toBeInTheDocument();
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

  it("opens the created analysis named by the automation query, and a reload stays on it", () => {
    scopesResult.created = [created()];
    frameResult = {
      data: analysis({
        scope: { locationIds: ["sheikan"], name: "x", windowStart: "2026-07-01T00:00:00.000Z", windowEnd: null },
      }),
      isLoading: false,
      isError: false,
    };
    search = "automation=auto-1";
    renderHome();
    expect(frameQuery).toHaveBeenLastCalledWith(
      {
        locationIds: ["sheikan"],
        eventTypes: [],
        needSectors: [],
        windowStart: "2026-07-01T00:00:00.000Z",
        name: "Sheikan, North Kordofan, Sudan",
      },
      expect.objectContaining({ enabled: true }),
    );
    expect(screen.getByRole("heading", { name: "Sheikan, North Kordofan, Sudan" })).toBeInTheDocument();
    expect(screen.queryByText("analysis.home.title")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/insights?insights=auto-1", { scroll: false });
    expect(search).toBe("insights=auto-1");

    cleanup();
    renderHome();
    expect(screen.getByRole("heading", { name: "Sheikan, North Kordofan, Sudan" })).toBeInTheDocument();

    cleanup();
    replace.mockClear();
    search = "analysis=auto-1";
    renderHome();
    expect(screen.getByRole("heading", { name: "Sheikan, North Kordofan, Sudan" })).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/insights?insights=auto-1", { scroll: false });
  });

  it("records the automation id when a created analysis is opened, and back returns to the list", () => {
    scopesResult.created = [created()];
    frameResult = {
      data: analysis({
        summary: "The Sheikan analysis.",
        scope: { locationIds: ["sheikan"], name: "x", windowStart: "2026-07-01T00:00:00.000Z", windowEnd: null },
      }),
      isLoading: false,
      isError: false,
    };
    renderHome();
    fireEvent.click(within(screen.getByTestId("analysis-scope-auto-1")).getAllByRole("button")[0]!);
    expect(replace).toHaveBeenCalledWith("/insights?insights=auto-1", { scroll: false });
    expect(screen.getByRole("heading", { name: "Sheikan, North Kordofan, Sudan" })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("analysis-back"));
    expect(replace).toHaveBeenLastCalledWith("/insights", { scroll: false });
    expect(screen.getByText("analysis.home.title")).toBeInTheDocument();
  });

  it("opens the country named by the country query, including when another country is the working one", () => {
    team = { countries: [AFG, SUDAN], countryId: "sdn" };
    search = "country=afg";
    renderHome();
    expect(currentQuery).toHaveBeenLastCalledWith(
      { countryLocationId: "afg", countryName: "Afghanistan" },
      expect.objectContaining({ enabled: true }),
    );
    expect(screen.getByRole("heading", { name: "Afghanistan" })).toBeInTheDocument();
    expect(screen.queryByText("analysis.home.title")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    cleanup();
    renderHome();
    expect(screen.getByRole("heading", { name: "Afghanistan" })).toBeInTheDocument();
  });

  it("records the country location id when the country analysis is opened, and back returns to the list", () => {
    renderHome();
    fireEvent.click(within(screen.getByTestId("analysis-scope-country")).getAllByRole("button")[0]!);
    expect(replace).toHaveBeenCalledWith("/insights?country=sdn", { scroll: false });
    expect(screen.getByRole("heading", { name: "Sudan" })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("analysis-back"));
    expect(replace).toHaveBeenLastCalledWith("/insights", { scroll: false });
    expect(screen.getByText("analysis.home.title")).toBeInTheDocument();
  });

  it("opens a created analysis from the automation query on that analysis's country", () => {
    team = { countries: [AFG, SUDAN], countryId: "sdn" };
    scopesResult.created = [
      created({ id: "auto-4", name: "Kabul, Afghanistan", countryId: "afg", locationIds: ["kabul"] }),
    ];
    frameResult = {
      data: analysis({ summary: "Kabul holds." }),
      isLoading: false,
      isError: false,
    };
    search = "automation=auto-4";
    renderHome();
    expect(scopesQuery).toHaveBeenLastCalledWith(
      { teamId: "team-1", countries: [{ id: "afg", name: "Afghanistan" }] },
      expect.objectContaining({ enabled: true }),
    );
    expect(frameQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ locationIds: ["kabul"], name: "Kabul, Afghanistan" }),
      expect.objectContaining({ enabled: true }),
    );
    expect(screen.getByRole("heading", { name: "Kabul, Afghanistan" })).toBeInTheDocument();
  });

  it("opens the generating state from an automation whose first version has not landed", () => {
    scopesResult.created = [created({ generatedAt: null, analysisId: null, createdAt: "2026-09-29T11:50:00.000Z" })];
    frameResult = { data: null, isLoading: false, isError: false };
    search = "automation=auto-1";
    renderHome();
    expect(screen.getByTestId("analysis-generating")).toHaveTextContent("analysis.generating.title");
    expect(screen.queryByText("analysis.error")).not.toBeInTheDocument();
  });

  it("shows the list for an automation id that is not in the scopes list", () => {
    scopesResult.created = [created()];
    search = "automation=missing";
    renderHome();
    expect(screen.getByText("analysis.home.title")).toBeInTheDocument();
    expect(screen.queryByText("analysis.error")).not.toBeInTheDocument();
    expect(frameQuery).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: true }));
    expect(replace).toHaveBeenCalledWith("/insights?insights=missing", { scroll: false });
  });

  it("shows the list for a country id this team cannot open", () => {
    search = "country=xyz";
    renderHome();
    expect(screen.getByText("analysis.home.title")).toBeInTheDocument();
    expect(screen.queryByText("analysis.error")).not.toBeInTheDocument();
    expect(currentQuery).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: true }));
  });

  it("follows query changes on the same page, from a created analysis to a country and back to the list", () => {
    team = { countries: [AFG, SUDAN], countryId: "sdn" };
    scopesResult.created = [created()];
    frameResult = {
      data: analysis({ summary: "The Sheikan analysis." }),
      isLoading: false,
      isError: false,
    };
    const view = renderHome();

    fireEvent.click(within(screen.getByTestId("analysis-scope-auto-1")).getAllByRole("button")[0]!);
    expect(search).toBe("insights=auto-1");
    expect(screen.getByRole("heading", { name: "Sheikan, North Kordofan, Sudan" })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("analysis-back"));
    expect(search).toBe("");
    expect(screen.getByText("analysis.home.title")).toBeInTheDocument();

    fireEvent.click(within(screen.getByTestId("analysis-scope-country")).getAllByRole("button")[0]!);
    expect(search).toBe("country=sdn");
    expect(screen.getByRole("heading", { name: "Sudan" })).toBeInTheDocument();

    search = "country=afg";
    view.rerender(<MantineProvider><AnalysisTab /></MantineProvider>);
    expect(screen.getByRole("heading", { name: "Afghanistan" })).toBeInTheDocument();

    search = "automation=missing";
    view.rerender(<MantineProvider><AnalysisTab /></MantineProvider>);
    expect(screen.getByText("analysis.home.title")).toBeInTheDocument();
    expect(screen.queryByText("analysis.error")).not.toBeInTheDocument();
  });

  it("keeps the automation and country keys apart", () => {
    team = { countries: [AFG, SUDAN], countryId: "sdn" };
    scopesResult.created = [created()];
    frameResult = {
      data: analysis({ summary: "The Sheikan analysis." }),
      isLoading: false,
      isError: false,
    };

    search = "automation=sdn";
    renderHome();
    expect(screen.getByText("analysis.home.title")).toBeInTheDocument();
    expect(currentQuery).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: true }));

    cleanup();
    search = "country=auto-1";
    renderHome();
    expect(screen.getByText("analysis.home.title")).toBeInTheDocument();
    expect(frameQuery).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: true }));

    cleanup();
    search = "automation=auto-1&country=afg";
    renderHome();
    expect(screen.getByRole("heading", { name: "Sheikan, North Kordofan, Sudan" })).toBeInTheDocument();
    expect(currentQuery).not.toHaveBeenCalledWith(
      { countryLocationId: "afg", countryName: "Afghanistan" },
      expect.anything(),
    );
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
    expect(eventsQuery).toHaveBeenLastCalledWith({
      locationIds: ["sheikan", "umrawaba"],
      from: "2026-07-01T00:00:00.000Z",
      citedIds: ["event:e1"],
    });
    expect(screen.getByTestId("analysis-section-timeline")).toBeInTheDocument();
    expect(screen.getByText("Shelling in El Fasher")).toBeInTheDocument();
    expect(screen.queryByText(/Treason proceedings/)).not.toBeInTheDocument();
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

  it("offers New analysis to every role, and hides remove from viewers", async () => {
    role = "viewer";
    activeTeamId = null;
    scopesResult.created = [created()];
    renderHome();
    expect(screen.getByTestId("analysis-new")).toBeInTheDocument();
    expect(screen.queryByTestId("analysis-remove")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("analysis-new"));
    expect(await screen.findByTestId("analysis-create-submit")).toBeDisabled();
    expect(screen.getByTestId("analysis-create-need-team")).toBeInTheDocument();
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
    scopesResult.created = [created()];
    frameResult = {
      data: analysis({ summary: "The existing Sheikan analysis." }),
      isLoading: false,
      isError: false,
    };
    await openCreate();
    await act(async () => {
      await createOpts.onSuccess?.(
        { id: "auto-1", firstVersionRequested: false, existing: true, cadence: "weekly" },
        { teamId: "team-1", locationIds: ["sheikan"], cadence: "weekly" },
      );
    });
    expect(showNotification).toHaveBeenCalledWith({ message: "analysis.create.existing" });
    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Sheikan, North Kordofan, Sudan" })).toBeInTheDocument();
    expect(screen.getByText(/The existing Sheikan analysis/)).toBeInTheDocument();
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

  it("keeps key findings to the subject line when the summary expands", () => {
    analysisResult = {
      data: analysis({
        summary: "First point. Second point. Third point. Fourth point.",
        keyFindings: [{ text: "Security: Drone strikes hit El Obeid on 25 Sep.", refs: [2] }],
      }),
      isLoading: false,
      isError: false,
    };
    renderPage();
    const findings = screen.getByTestId("analysis-highlights");
    expect(within(findings).getByText("Security").tagName).toBe("SPAN");
    expect(findings).not.toHaveTextContent("Drone strikes hit El Obeid on 25 Sep.");
    fireEvent.click(screen.getByTestId("summary-toggle"));
    expect(screen.getByText(/Third point\. Fourth point\./)).toBeInTheDocument();
    expect(findings).not.toHaveTextContent("Drone strikes hit El Obeid on 25 Sep.");
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
    const downloads: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
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
    expect(downloads[0]).toMatch(/^sitrep-sudan-\d{4}-\d{2}-\d{2}\.pdf$/);
    click.mockRestore();
  });

  it("shows the report error and clears the busy state when the PDF build never finishes", async () => {
    pdfToBlob.mockImplementation(() => new Promise(() => {}));
    renderPage();
    fireEvent.click(screen.getByTestId("analysis-create-report"));
    const create = await screen.findByTestId("report-builder-create");
    vi.useFakeTimers();
    fireEvent.click(create);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REPORT_BUILD_TIMEOUT_MS);
    });
    expect(showNotification).toHaveBeenCalledWith({ color: "red", message: "analysis.report.error" });
    expect(screen.getByTestId("report-builder-create")).toBeEnabled();
    expect(screen.getByTestId("analysis-create-report")).toBeEnabled();
  });

  it("opens a new analysis on its own frame and paints that version when it lands", async () => {
    frameResult = {
      data: analysis({
        summary: "Sheikan clinics are closed.",
        scope: {
          locationIds: ["sheikan"],
          name: "Sheikan, North Kordofan, Sudan",
          windowStart: "2026-07-01T00:00:00.000Z",
          windowEnd: null,
        },
      }),
      isLoading: false,
      isError: false,
    };
    const search = await openCreate();
    fireEvent.click(await screen.findByText("Sheikan", option));
    fireEvent.click(screen.getByTestId("analysis-create-submit"));
    await act(async () => {
      await createOpts.onSuccess?.(
        { id: "auto-9", firstVersionRequested: true, existing: false, cadence: "weekly" },
        { teamId: "team-1", locationIds: ["sheikan"], cadence: "weekly" },
      );
    });
    expect(screen.getByRole("heading", { name: "Sheikan, North Kordofan, Sudan" })).toBeInTheDocument();
    expect(screen.getByText(/Sheikan clinics are closed/)).toBeInTheDocument();
    expect(screen.queryByTestId("analysis-preview-page")).not.toBeInTheDocument();
    expect(frameQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ locationIds: ["sheikan"], name: "Sheikan, North Kordofan, Sudan" }),
      expect.objectContaining({ enabled: true }),
    );
  });

  it("shows generating for a new analysis until its first version exists, not the sample", async () => {
    frameResult = { data: null, isLoading: false, isError: false };
    await openCreate();
    fireEvent.click(await screen.findByText("Sheikan", option));
    fireEvent.click(screen.getByTestId("analysis-create-submit"));
    await act(async () => {
      await createOpts.onSuccess?.(
        { id: "auto-9", firstVersionRequested: true, existing: false, cadence: "weekly" },
        { teamId: "team-1", locationIds: ["sheikan"], cadence: "weekly" },
      );
    });
    expect(screen.getByTestId("analysis-generating")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sheikan, North Kordofan, Sudan" })).toBeInTheDocument();
    expect(screen.queryByTestId("analysis-preview-page")).not.toBeInTheDocument();
    expect(screen.queryByText("12.6M")).not.toBeInTheDocument();
  });
});
