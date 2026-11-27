import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";

vi.mock("next-intl", () => ({
  useTranslations: () =>
    Object.assign((key: string) => key, {
      rich: (key: string, values?: { total?: number }) => (values?.total === undefined ? key : `${key}:${values.total}`),
    }),
  useFormatter: () => ({ number: String }),
  useLocale: () => "en",
}));


const queries = vi.hoisted(() => ({
  buckets: [] as { key: string; count: number }[],
  mapSignals: [] as { id: string }[],
}));

vi.mock("~/trpc/react", () => ({
  api: {
    alerts: {
      entityStats: {
        useQuery: () => ({ data: { buckets: queries.buckets }, isPending: false, isError: false, error: null }),
      },
      alertsForMap: { useQuery: () => ({ data: undefined, isPending: false, isError: false, error: null }) },
      eventsForMap: { useQuery: () => ({ data: undefined, isPending: false, isError: false, error: null }) },
    },
    signals: {
      forMap: {
        useQuery: () => ({
          data: queries.mapSignals,
          isPending: false,
          isPlaceholderData: false,
          isError: false,
          error: null,
        }),
      },
    },
  },
}));

const { Timeline } = await import("./index");
const { TimeframeQueryProvider } = await import("../hooks/use-timeframe");

const SIGNALS_LAYER = JSON.stringify([{ id: "signals", visibility: true, opacity: 1 }]);

function renderTimeline(
  onUrlUpdate: (event: UrlUpdateEvent) => void,
  onHeightChange = vi.fn(),
  searchParams: Record<string, string> = {},
) {
  return render(
    <MantineProvider>
      <NuqsTestingAdapter searchParams={{ layers: SIGNALS_LAYER, ...searchParams }} onUrlUpdate={onUrlUpdate}>
        <TimeframeQueryProvider>
          <Timeline onHeightChange={onHeightChange} />
        </TimeframeQueryProvider>
      </NuqsTestingAdapter>
    </MantineProvider>,
  );
}

// jsdom has no PointerEvent, so fireEvent.pointerDown would drop clientX and button.
class TestPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}
window.PointerEvent ??= TestPointerEvent as unknown as typeof PointerEvent;

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  window.matchMedia = (query: string) => ({ ...realMatchMedia(query), matches: true });
});

afterEach(() => {
  cleanup();
  queries.buckets = [];
  queries.mapSignals = [];
  vi.useRealTimers();
  window.matchMedia = realMatchMedia;
});

describe("Timeline", () => {
  it("opens on the first render of a wide screen", () => {
    const onHeightChange = vi.fn();
    renderTimeline(vi.fn(), onHeightChange);

    expect(onHeightChange.mock.calls.every(([, open]) => open)).toBe(true);
  });

  it("writes ?time when a preset is clicked", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    renderTimeline(onUrlUpdate);

    fireEvent.click(screen.getByRole("button", { name: "presets.7d" }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.calls.at(-1)![0].searchParams.get("time")).toBe("7d");
  });

  it("counts a rolling timeframe from the map's signals, not from whole-day bars", () => {
    vi.useFakeTimers({ now: new Date("2026-11-23T00:30:00Z") });
    queries.buckets = [{ key: "2026-11-23", count: 1 }];
    queries.mapSignals = [{ id: "a" }, { id: "b" }, { id: "c" }];
    renderTimeline(vi.fn(), vi.fn(), { time: "24h" });

    expect(screen.getByText("count.signal:3")).toBeTruthy();
  });

  it("counts a fixed range from the bars", () => {
    vi.useFakeTimers({ now: new Date("2026-11-23T10:00:00Z") });
    queries.buckets = [
      { key: "2026-11-01", count: 2 },
      { key: "2026-11-02", count: 5 },
      { key: "2026-11-03", count: 7 },
    ];
    queries.mapSignals = [{ id: "a" }];
    renderTimeline(vi.fn(), vi.fn(), { time: "2026-11-01..2026-11-02" });

    expect(screen.getByText("count.signal:7")).toBeTruthy();
  });

  it("keeps the range when a handle's knob is pressed and released without a drag", () => {
    vi.useFakeTimers({ now: new Date("2026-11-23T10:00:00Z") });
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    renderTimeline(onUrlUpdate, vi.fn(), { time: "2026-11-01..2026-11-10" });

    const end = screen.getByRole("slider", { name: "endHandle" });
    const bars = end.parentElement!;
    bars.getBoundingClientRect = () => ({ left: 0, right: 900, width: 900 }) as DOMRect;
    Object.assign(bars, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() });

    // Bars are 10px wide; the end handle sits on the right edge of 10 Nov, x = 770.
    fireEvent.pointerDown(end, { button: 0, clientX: 774, pointerId: 1 });
    fireEvent.pointerUp(end, { button: 0, clientX: 774, pointerId: 1 });
    act(() => vi.advanceTimersByTime(1000));

    expect(onUrlUpdate).not.toHaveBeenCalled();
  });

  it("debounces keyboard commits", () => {
    vi.useFakeTimers({ now: new Date("2026-11-23T10:00:00Z") });
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    renderTimeline(onUrlUpdate);

    const end = screen.getByRole("slider", { name: "endHandle" });
    end.focus();
    for (let i = 0; i < 5; i++) fireEvent.keyDown(end, { key: "ArrowLeft" });
    act(() => vi.advanceTimersByTime(399));
    expect(onUrlUpdate).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(500));
    expect(onUrlUpdate).toHaveBeenCalledTimes(1);
    expect(onUrlUpdate.mock.calls[0]![0].searchParams.get("time")).toBe("2026-10-25..2026-11-18");
  });
});
