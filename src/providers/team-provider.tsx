"use client";

import { createContext, useContext } from "react";
import { useActiveTeam } from "~/hooks/use-active-team";

type TeamContextType = ReturnType<typeof useActiveTeam>;

const TeamContext = createContext<TeamContextType | null>(null);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const team = useActiveTeam();
  return <TeamContext.Provider value={team}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}
