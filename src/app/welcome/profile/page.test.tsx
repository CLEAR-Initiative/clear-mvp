import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../messages/en.json";
import { WORKING_COUNTRY_COOKIE } from "~/lib/working-country-cookie";

/**
 * The phone dial code defaults to the invitee's team country. While teams
 * load, the working country falls back to whatever this browser saved for an
 * earlier team, so the default must wait until the team scope is ready.
 */

const mutateAsync = vi.fn().mockResolvedValue({});
vi.mock("~/trpc/react", () => ({
  api: {
    auth: {
      me: {
        useQuery: () => ({
          data: { authenticated: true, user: { id: "u1", name: "Ada Invitee" } },
          isLoading: false,
        }),
      },
      myUserDetails: { useQuery: () => ({ data: undefined }) },
      updateProfile: { useMutation: () => ({ mutateAsync }) },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

type TeamState = {
  activeTeamId: string | null;
  activeTeam: { id: string; locations: { id: string; name: string; level: number }[] } | null;
  teams: unknown[] | undefined;
  isLoading: boolean;
};
let teamState: TeamState;
vi.mock("~/providers/team-provider", async () => {
  const actual = await vi.importActual<typeof import("~/providers/team-provider")>(
    "~/providers/team-provider",
  );
  return { ...actual, useTeam: () => teamState };
});

const { WorkingCountryProvider } = await import("~/providers/working-country-provider");
const { default: WelcomeProfilePage } = await import("./page");

function ui() {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>
        <WorkingCountryProvider>
          <WelcomeProfilePage />
        </WorkingCountryProvider>
      </MantineProvider>
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  cleanup();
  document.cookie = `${WORKING_COUNTRY_COOKIE}=; path=/; max-age=0`;
  localStorage.clear();
  mutateAsync.mockClear();
});

describe("WelcomeProfilePage", () => {
  it("defaults the dial code to the invitee's team, not a country saved for another team", async () => {
    document.cookie = `${WORKING_COUNTRY_COOKIE}=${encodeURIComponent(
      JSON.stringify({ "earlier-team": { id: "af", name: "Afghanistan" } }),
    )}; path=/`;

    teamState = { activeTeamId: null, activeTeam: null, teams: undefined, isLoading: true };
    const { rerender } = render(ui());

    const sudanTeam = { id: "t-sudan", locations: [{ id: "sd", name: "Sudan", level: 0 }] };
    teamState = { activeTeamId: sudanTeam.id, activeTeam: sudanTeam, teams: [sudanTeam], isLoading: false };
    rerender(ui());

    fireEvent.change(screen.getByPlaceholderText("912 345 678"), {
      target: { value: "912345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        name: "Ada Invitee",
        phoneNumber: "+249912345678",
      }),
    );
  });
});
