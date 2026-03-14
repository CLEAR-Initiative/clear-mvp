"use client";

import { useState, useMemo } from "react";
import { mapSeverity } from "~/lib/types/graphql";

export type SeverityKey = "critical" | "high" | "medium" | "low";
export type SortOrder = "sev-desc" | "sev-asc" | "newest" | "oldest";

export const SORT_LABELS: Record<SortOrder, string> = {
  "sev-desc": "Severity: High to Low",
  "sev-asc":  "Severity: Low to High",
  "newest":   "Newest first",
  "oldest":   "Oldest first",
};

interface FilterableItem {
  severity: number;
  eventType: string;
  description: string | null;
  locations: Array<{ location: { name: string } }>;
  firstSignalCreatedAt?: string;
  createdAt: string;
}

export function useListFilters<T extends FilterableItem>(items: T[]) {
  const [search, setSearch] = useState("");
  const [activeSeverities, setActiveSeverities] = useState<Set<SeverityKey>>(
    new Set(["critical", "high", "medium", "low"]),
  );
  const [activeTypes, setActiveTypes] = useState<Set<string> | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("sev-desc");

  const allTypes = useMemo(
    () => [...new Set(items.map((e) => e.eventType))].sort(),
    [items],
  );

  function toggleSeverity(sev: SeverityKey) {
    setActiveSeverities((prev) => {
      const next = new Set(prev);
      next.has(sev) ? next.delete(sev) : next.add(sev);
      return next;
    });
  }

  function toggleType(type: string) {
    setActiveTypes((prev) => {
      const base = prev ?? new Set(allTypes);
      const next = new Set(base);
      next.has(type) ? next.delete(type) : next.add(type);
      return next.size === allTypes.length ? null : next;
    });
  }

  function clearFilters() {
    setSearch("");
    setActiveSeverities(new Set(["critical", "high", "medium", "low"]));
    setActiveTypes(null);
    setSortOrder("sev-desc");
  }

  const isFiltered =
    search.trim() !== "" ||
    activeSeverities.size < 4 ||
    activeTypes !== null ||
    sortOrder !== "sev-desc";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = items.filter((item) => {
      const sev = mapSeverity(item.severity);
      if (!activeSeverities.has(sev)) return false;
      if (activeTypes !== null && !activeTypes.has(item.eventType)) return false;
      if (q) {
        const title = (item.description ?? item.eventType).toLowerCase();
        const loc = item.locations[0]?.location.name.toLowerCase() ?? "";
        if (!title.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortOrder === "sev-desc") return b.severity - a.severity;
      if (sortOrder === "sev-asc")  return a.severity - b.severity;
      if (sortOrder === "newest")
        return new Date(b.firstSignalCreatedAt ?? b.createdAt).getTime() -
               new Date(a.firstSignalCreatedAt ?? a.createdAt).getTime();
      return new Date(a.firstSignalCreatedAt ?? a.createdAt).getTime() -
             new Date(b.firstSignalCreatedAt ?? b.createdAt).getTime();
    });

    return result;
  }, [items, search, activeSeverities, activeTypes, sortOrder]);

  return {
    search, setSearch,
    activeSeverities, toggleSeverity,
    activeTypes, allTypes, toggleType,
    sortOrder, setSortOrder,
    isFiltered, clearFilters,
    filtered,
  };
}
