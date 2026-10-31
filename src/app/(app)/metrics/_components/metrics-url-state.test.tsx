import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

let search = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/metrics",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

const { EMPTY_URL_STATE, MetricsUrlProvider, filtersFromUrl, metricsUrlSearch, parseMetricsUrl, useMetricsUrl } = await import("./metrics-url-state");

describe("parseMetricsUrl", () => {
  it("reads every key, normalising the bucket size and splitting the sources", () => {
    const state = parseMetricsUrl(
      new URLSearchParams("from=2026-10-25&to=2026-10-31&location=loc-sdn&metric=DISTRICT_OR_FINER&granularity=Day&lines=all&sources=sudan-war-x,%20dataminr,sudan-war-x"),
    );
    expect(state).toEqual({
      from: "2026-10-25",
      to: "2026-10-31",
      locationId: "loc-sdn",
      metric: "DISTRICT_OR_FINER",
      granularity: "DAY",
      lines: "all",
      sources: ["sudan-war-x", "dataminr"],
    });
  });

  it("treats anything malformed as unset", () => {
    expect(parseMetricsUrl(new URLSearchParams(""))).toEqual(EMPTY_URL_STATE);
    expect(
      parseMetricsUrl(new URLSearchParams("from=yesterday&to=2026-13-45&metric=drop%20table&granularity=hourly&lines=maybe&location=%20%20")),
    ).toEqual(EMPTY_URL_STATE);
    expect(parseMetricsUrl(new URLSearchParams("metric=detected_same_day")).metric).toBeNull();
    expect(parseMetricsUrl(new URLSearchParams("sources=,,")).sources).toEqual([]);
  });
});

describe("metricsUrlSearch", () => {
  it("writes a patch over the current search, removing what the patch empties", () => {
    const current = new URLSearchParams("from=2026-10-25&to=2026-10-31&metric=DISTRICT_OR_FINER&lines=source&sources=a,b");
    expect(metricsUrlSearch({ granularity: "WEEK", lines: "all" }, current)).toBe("from=2026-10-25&to=2026-10-31&metric=DISTRICT_OR_FINER&lines=all&sources=a%2Cb&granularity=week");
    expect(metricsUrlSearch({ from: "", to: "", sources: [] }, current)).toBe("metric=DISTRICT_OR_FINER&lines=source");
    expect(metricsUrlSearch({ locationId: "loc-sdn" })).toBe("location=loc-sdn");
    expect(metricsUrlSearch({ locationId: null }, new URLSearchParams("location=loc-sdn"))).toBe("");
    expect(metricsUrlSearch({})).toBe("");
  });

  it("round-trips through parseMetricsUrl", () => {
    const state = { from: "2026-10-25", to: "2026-10-31", locationId: "loc-sdn", metric: "DETECTED_SAME_DAY", granularity: "MONTH" as const, lines: "source" as const, sources: ["sudan-war-x"] };
    expect(parseMetricsUrl(new URLSearchParams(metricsUrlSearch(state)))).toEqual(state);
  });
});

describe("filtersFromUrl", () => {
  it("picks the page's filters out of the URL state", () => {
    expect(filtersFromUrl({ ...EMPTY_URL_STATE, from: "2026-10-25", locationId: "loc-sdn" })).toEqual({ from: "2026-10-25", to: "", locationId: "loc-sdn" });
    expect(filtersFromUrl(EMPTY_URL_STATE)).toEqual({ from: "", to: "", locationId: null });
  });
});

describe("MetricsUrlProvider", () => {
  afterEach(() => {
    cleanup();
    search = "";
    replace.mockClear();
  });

  let url: ReturnType<typeof useMetricsUrl> | null = null;
  function Probe() {
    url = useMetricsUrl();
    return null;
  }
  const tree = () => (
    <MetricsUrlProvider>
      <Probe />
    </MetricsUrlProvider>
  );

  it("merges quick successive writes into the last write, not the URL the router has committed", () => {
    const view = render(tree());
    act(() => url!.update({ metric: "DISTRICT_OR_FINER" }));
    act(() => url!.update({ granularity: "DAY" }));
    expect(replace).toHaveBeenLastCalledWith("/metrics?metric=DISTRICT_OR_FINER&granularity=day", { scroll: false });

    // The router commits the first write while the second is still in flight: the chain keeps both.
    search = "metric=DISTRICT_OR_FINER";
    view.rerender(tree());
    act(() => url!.update({ lines: "all" }));
    expect(replace).toHaveBeenLastCalledWith("/metrics?metric=DISTRICT_OR_FINER&granularity=day&lines=all", { scroll: false });
    expect(url!.state.metric).toBe("DISTRICT_OR_FINER");
  });

  it("starts over from a search the page did not write, and reads its state from the committed URL", () => {
    const view = render(tree());
    act(() => url!.update({ metric: "DISTRICT_OR_FINER" }));

    search = "from=2026-10-01";
    view.rerender(tree());
    expect(url!.state).toEqual({ ...EMPTY_URL_STATE, from: "2026-10-01" });
    act(() => url!.update({ metric: "DETECTED_SAME_DAY" }));
    expect(replace).toHaveBeenLastCalledWith("/metrics?from=2026-10-01&metric=DETECTED_SAME_DAY", { scroll: false });

    // Emptying every key leaves the bare path.
    search = "from=2026-10-01&metric=DETECTED_SAME_DAY";
    view.rerender(tree());
    act(() => url!.update({ from: "", metric: null }));
    expect(replace).toHaveBeenLastCalledWith("/metrics", { scroll: false });
  });

  it("refuses a caller outside the provider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/MetricsUrlProvider/);
    quiet.mockRestore();
  });
});
