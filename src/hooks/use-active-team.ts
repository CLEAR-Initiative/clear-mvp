"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";

const STORAGE_KEY = "clear-active-team-id";

export function useActiveTeam() {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const { data: teams, isLoading } = api.teams.myTeams.useQuery();
  const setDefault = api.teams.setDefaultTeam.useMutation();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveTeamId(stored);
    }
  }, []);

  // If no stored team but user has teams, pick the first one
  useEffect(() => {
    if (!activeTeamId && teams?.length) {
      switchTeam(teams[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeamId, teams]);

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

  return { activeTeamId, activeTeam, teams, isLoading, switchTeam };
}
