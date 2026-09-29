import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlCrisis } from "~/server/api/routers/crises";
import { NeedsAssessmentPanel } from "./needs-assessment-panel";

vi.mock("next-intl", () => {
  const t = Object.assign((key: string) => key, {
    rich: (key: string) => key,
  });
  return {
    useTranslations: () => t,
    useFormatter: () => ({ dateTime: () => "Aug 2025" }),
  };
});

afterEach(cleanup);

const crisis = {
  id: "c1",
  generalLocation: null,
  events: [],
  needs: {
    generalSummary: "Needs are acute.",
    sector: {
      WASH: { severity: "Severe", description: "Water trucking is failing." },
      Health: { severity: "Catastrophic", description: "Hospitals closed.", responseGap: true },
    },
  },
} as unknown as GqlCrisis;

describe("NeedsAssessmentPanel (crisis adapter)", () => {
  it("renders SAF severities from crisis.needs, most severe first, with the description on expand", () => {
    render(
      <MantineProvider>
        <NeedsAssessmentPanel crisis={crisis} />
      </MantineProvider>,
    );
    const names = screen.getAllByText(/^needs\.sectors\./).map((el) => el.textContent);
    expect(names.slice(0, 2)).toEqual(["needs.sectors.health", "needs.sectors.wash"]);
    expect(screen.getByText("needs.saf.catastrophic")).toBeInTheDocument();
    expect(screen.getByText("needs.saf.severe")).toBeInTheDocument();
    expect(screen.getByText("Needs are acute.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("needs.sectors.health"));
    expect(screen.getByText("Hospitals closed.")).toBeInTheDocument();
    expect(screen.getByText("needs.responseGap")).toBeInTheDocument();
  });
});
