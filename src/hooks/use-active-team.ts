"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";

const STORAGE_KEY = "clear-active-team-id";

export function useActiveTeam() {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  // The stored id is read in an effect, so the fallback below must wait for
  // it or it would replace a valid stored team on the first render.
  const [storageRead, setStorageRead] = useState(false);
  const { data: teams, isLoading, isError } = api.teams.myTeams.useQuery();
  const setDefault = api.teams.setDefaultTeam.useMutation();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveTeamId(stored);
    }
    setStorageRead(true);
  }, []);

  // No stored team, or a stored one the user is not in (another environment,
  // or removed from it): pick the first team the user belongs to
  useEffect(() => {
    if (storageRead && teams?.length && !teams.some((t) => t.id === activeTeamId)) {
      switchTeam(teams[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageRead, activeTeamId, teams]);

  const switchTeam = useCallback(
    (teamId: string) => {
      setActiveTeamId(teamId);
      localStorage.setItem(STORAGE_KEY, teamId);
      // Fire-and-forget: persist as default on server
      setDefault.mutate({ teamId });
    },
    [setDefault],
  );

  const activeTeam = teams?.find((t) => t.id === activeTeamId) ?? null;

  return { activeTeamId, activeTeam, teams, isLoading, isError, switchTeam };
}
