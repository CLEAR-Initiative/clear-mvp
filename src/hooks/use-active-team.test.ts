import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

/**
 * The active team: a stored team the user belongs to is kept; a stored id
 * the user is not in (another environment, or removed) falls back to the
 * first team instead of leaving the app with no team and no country scope.
 */

let teams: { id: string; name: string }[] | undefined;
const setDefault = vi.fn();

vi.mock("~/trpc/react", () => ({
  api: {
    teams: {
      myTeams: { useQuery: () => ({ data: teams, isLoading: teams === undefined, isError: false }) },
      setDefaultTeam: { useMutation: () => ({ mutate: setDefault }) },
    },
  },
}));

const { useActiveTeam } = await import("./use-active-team");

afterEach(() => {
  localStorage.clear();
  setDefault.mockReset();
});

describe("useActiveTeam", () => {
  it("keeps a stored team the user belongs to", async () => {
    teams = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
    localStorage.setItem("clear-active-team-id", "b");
    const { result } = renderHook(() => useActiveTeam());
    await waitFor(() => expect(result.current.activeTeam?.id).toBe("b"));
  });

  it("falls back to the first team when the stored one is not the user's", async () => {
    teams = [{ id: "a", name: "A" }];
    localStorage.setItem("clear-active-team-id", "from-another-env");
    const observedIds: (string | null)[] = [];
    const { result } = renderHook(() => {
      const { activeTeamId } = useActiveTeam();
      observedIds.push(activeTeamId);
      return activeTeamId;
    });
    await waitFor(() => expect(result.current).toBe("a"));
    expect(observedIds).not.toContain("from-another-env");
    expect(localStorage.getItem("clear-active-team-id")).toBe("a");
  });

  it("exposes no stored team ID while memberships load or when the user has no teams", () => {
    teams = undefined;
    localStorage.setItem("clear-active-team-id", "removed-team");
    const { result, rerender } = renderHook(() => useActiveTeam());
    expect(result.current.activeTeamId).toBeNull();

    teams = [];
    rerender();
    expect(result.current.activeTeamId).toBeNull();
  });

  it("picks the first team when nothing is stored", async () => {
    teams = [{ id: "a", name: "A" }];
    const { result } = renderHook(() => useActiveTeam());
    await waitFor(() => expect(result.current.activeTeam?.id).toBe("a"));
  });
});
