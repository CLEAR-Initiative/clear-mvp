import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

/**
 * The host's analytics wiring (#1214): the tour's trigger and first-on-device
 * flag, and recording onboarding completion once (never on a replay).
 */

let tourParam: string | null = null;
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: () => tourParam }),
}));

const recordMutate = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    auth: {
      me: { useQuery: () => ({ data: { user: { id: "u1" } } }) },
      recordOnboardingCompleted: { useMutation: () => ({ mutate: recordMutate }) },
    },
  },
}));

type TourProps = { trigger?: string; firstOnDevice?: boolean; onComplete: (o?: unknown) => void };
let tourProps: TourProps | null = null;
vi.mock("~/components/onboarding/product-tour", () => ({
  ProductTour: (props: TourProps) => {
    tourProps = props;
    return null;
  },
}));

const { ProductTourHost } = await import("./product-tour-host");

afterEach(() => {
  cleanup();
  localStorage.clear();
  recordMutate.mockReset();
  tourProps = null;
  tourParam = null;
});

describe("ProductTourHost analytics", () => {
  it("starts an auto tour as first on this device and records onboarding completion once", () => {
    tourParam = "1";
    render(<ProductTourHost />);
    expect(tourProps).toMatchObject({ trigger: "auto", firstOnDevice: true });
    act(() => tourProps!.onComplete({ landOnMap: false }));
    expect(recordMutate).toHaveBeenCalledTimes(1);
    expect(recordMutate.mock.calls[0]).toEqual([]);
  });

  it("never records onboarding completion on a replay", () => {
    localStorage.setItem(
      "clear-onboarding:u1",
      JSON.stringify({ onboardingTourCompletedAt: "2026-01-01", onboardingCompletedAt: "2026-01-01" }),
    );
    tourParam = "replay";
    render(<ProductTourHost />);
    expect(tourProps).toMatchObject({ trigger: "replay", firstOnDevice: false });
    act(() => tourProps!.onComplete({ landOnMap: false }));
    expect(recordMutate).not.toHaveBeenCalled();
  });
});
