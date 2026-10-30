"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { expandSelectionsToCodes } from "~/components/disaster-type-picker";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import {
  ALL_COUNTRIES,
  pickerCountryOptions,
  resolveSelectedCountry,
  useTeamCountry,
} from "~/hooks/use-team-country";
import { useReportStaleCountryPick } from "~/lib/report-stale-country-pick";
import { parseDateFilter } from "~/lib/constants/country-config";
import { useLocations } from "~/hooks/use-locations";
import {
  DETECTION_DEEP_LINK_PARAMS,
  DETECTION_ONE_SHOT_PARAMS,
  readDetectionDeepLink,
  resolveLinkScope,
  withoutDeepLink,
} from "~/lib/agent-deep-link";
import { useAgentDeepLink } from "~/components/agent/use-agent-deep-link";
import type { DetectionFeedFilter } from "./use-history-feed";

/** Where /detection keeps its filters. Another page passes its own `persistKey`. */
export const DETECTION_FILTERS_STORAGE_KEY = "detection-filters";
/**
 * Filters chosen during a deep-linked visit (an Agent navigation), kept
 * apart from the page's defaults and tagged with the link's country, so a
 * revisit of that link restores them and an ordinary visit never sees them.
 */
const LINK_FILTERS_STORAGE_KEY = "detection-link-filters";

export type BoundaryLevel = "none" | "A0" | "A1" | "A2";

// Persisted so filter selections survive a round trip through a
// signal/event detail page (which unmounts the page).
interface StoredFilters {
  country?: string;
  regionId?: string | null;
  date?: string;
  severities?: string[];
  typeFilters?: string[];
  sources?: string[] | null;
  boundaryLevel?: BoundaryLevel;
}

function readStoredFilters(key: string): StoredFilters & { countryId?: string } {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredFilters & { countryId?: string }) : {};
  } catch {
    return {}; // sessionStorage unavailable (SSR or private mode)
  }
}

const ALL_SEVERITIES = ["critical", "high", "medium", "low"] as const;
const SEV_NUM: Record<string, number> = { low: 2, medium: 3, high: 4, critical: 5 };
const NO_PARAMS: readonly string[] = [];
const EMPTY_SEARCH_PARAMS = new URLSearchParams();

type AreaTree = ReturnType<typeof useLocations>["tree"];

/** A location id's country and, below country level, its region (state or district). */
function locateArea(tree: AreaTree, id: string): { country: string; regionId: string | null } | null {
  for (const country of tree) {
    if (country.id === id) return { country: country.name, regionId: null };
    for (const state of country.states) {
      if (state.id === id) return { country: country.name, regionId: state.id };
      if (state.districts.some((d) => d.id === id)) return { country: country.name, regionId: id };
    }
  }
  return null;
}

export interface DetectionFiltersOptions {
  /**
   * Starting scope that wins over the saved filters. `locationId` (a country,
   * state or district id) holds until the user picks a country, without
   * touching the working country. `from`/`to` (ISO) set a custom window
   * until the user picks a date preset.
   */
  initial?: { locationId?: string; from?: string; to?: string };
  /** sessionStorage key for the filters. Defaults to /detection's own key. */
  persistKey?: string;
  /**
   * Honour CLEAR Agent deep links (`countryId`, `regionId`, `date`,
   * `severities`) and rewrite them on this path. Only /detection does.
   */
  agentDeepLinkPath?: string;
}

/**
 * Detection's filter state: country and region, date, severities, disaster
 * types and sources, the map's boundary level, their sessionStorage
 * persistence and Agent deep links. Returns the props FilterBar and the
 * filter popover need, plus `filter`, the scope every feed queries.
 */
export function useDetectionFilters({
  initial,
  persistKey = DETECTION_FILTERS_STORAGE_KEY,
  agentDeepLinkPath,
}: DetectionFiltersOptions = {}) {
  const t = useTranslations("detection");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storageReady, setStorageReady] = useState(false);

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("Last 30 days");
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(() =>
    initial?.from && initial.to ? { from: initial.from, to: initial.to } : null,
  );
  // The starting area, until the user picks a country.
  const [areaOverride, setAreaOverride] = useState<string | null>(() => initial?.locationId ?? null);
  const localizedDateOptions = useMemo(() => {
    const now = new Date();
    const englishMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const fmt = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" });
    const result: { value: string; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ value: `${englishMonths[d.getMonth()]} ${d.getFullYear()}`, label: fmt.format(d) });
    }
    result.push(
      { value: "Last 1 day",   label: t("filters.last1day") },
      { value: "Last 2 days",  label: t("filters.last2days") },
      { value: "Last 3 days",  label: t("filters.last3days") },
      { value: "Last 7 days",  label: t("filters.last7days") },
      { value: "Last 30 days", label: t("filters.last30days") },
      { value: "Last 90 days", label: t("filters.last90days") },
    );
    return result;
  }, [locale, t]);
  const [activeSeverities, setActiveSeverities] = useState<Set<string>>(
    () => new Set(ALL_SEVERITIES),
  );
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<string[]>([]);
  const hierarchyQuery = api.alerts.getDisasterTypeHierarchy.useQuery(undefined, { staleTime: Infinity, refetchOnWindowFocus: false });
  const hierarchy = hierarchyQuery.data ?? [];
  const expandedTypeCodes = selectedTypeFilters.length > 0 ? expandSelectionsToCodes(selectedTypeFilters, hierarchy) : null;
  const [activeSources, setActiveSources] = useState<Set<string> | null>(null);

  const { activeTeamId } = useTeam();
  const { countries, getCenter, getZoom, getLocationId, tree, isLoading: isLocationsLoading } = useLocations();
  const {
    countries: teamCountries,
    countryName: workingCountryName,
    setWorkingCountry,
    scopeReady,
  } = useTeamCountry();

  // Country the user picked. Scoped teams use the working-country cookie;
  // multi-country unset (All Countries) means every assigned country.
  const [pickedCountry, setPickedCountry] = useState("");
  const teamCountryNames = useMemo(() => teamCountries.map((c) => c.name), [teamCountries]);
  // An Agent navigation deep link's country holds for this visit only and
  // doesn't touch the working country; picking a country drops it. Its place
  // is matched by id against this page's locations tree and the active
  // team's scope: only a place the page can show ever overrides.
  const detectionDeepLink = useMemo(
    () => readDetectionDeepLink(agentDeepLinkPath ? searchParams : EMPTY_SEARCH_PARAMS),
    [agentDeepLinkPath, searchParams],
  );
  const linkScope = useMemo(
    () =>
      resolveLinkScope({
        countryId: detectionDeepLink.countryId,
        regionId: detectionDeepLink.regionId,
        tree,
        teamCountryNames,
        scopeReady,
      }),
    [detectionDeepLink.countryId, detectionDeepLink.regionId, tree, teamCountryNames, scopeReady],
  );
  const linkCountry = linkScope.status === "honoured" ? linkScope.country : undefined;
  const overrideArea = useMemo(
    () => (areaOverride ? locateArea(tree, areaOverride) : null),
    [areaOverride, tree],
  );
  const countryCandidate = linkCountry ?? overrideArea?.country ?? workingCountryName ?? pickedCountry;
  const selectedCountry = resolveSelectedCountry(teamCountryNames, countryCandidate, scopeReady);
  // While the starting area holds, the region shown is the area's own.
  const regionId = areaOverride ? (overrideArea?.regionId ?? null) : selectedRegionId;

  const handleCountryChange = useCallback(
    (value: string) => {
      // Picking a country ends a deep link's override.
      if (agentDeepLinkPath && detectionDeepLink.countryId) {
        const rest = withoutDeepLink(new URLSearchParams(searchParams.toString()), DETECTION_DEEP_LINK_PARAMS);
        router.replace(`${agentDeepLinkPath}${rest}`, { scroll: false });
      }
      // ...and the starting area's.
      setAreaOverride(null);
      if (value === ALL_COUNTRIES) {
        setPickedCountry(ALL_COUNTRIES);
        setWorkingCountry("", ALL_COUNTRIES);
      } else if (teamCountries.length > 0) {
        const location = teamCountries.find((c) => c.name === value);
        if (location) setWorkingCountry(location.id);
      } else {
        setPickedCountry(value);
        setWorkingCountry(getLocationId(value) ?? value, value);
      }
      // Reset region when country changes
      setSelectedRegionId(null);
    },
    [teamCountries, setWorkingCountry, getLocationId, agentDeepLinkPath, detectionDeepLink.countryId, searchParams, router],
  );

  const handleRegionChange = useCallback(
    (id: string | null) => {
      // Within the starting area's country, a region pick moves the area.
      if (areaOverride) setAreaOverride(id ?? getLocationId(selectedCountry) ?? areaOverride);
      else setSelectedRegionId(id);
    },
    [areaOverride, getLocationId, selectedCountry],
  );

  const handleDateChange = useCallback((value: string) => {
    setCustomRange(null);
    setSelectedDate(value);
  }, []);

  const countryOptions = useMemo(() => {
    if (!scopeReady) {
      return workingCountryName ? [workingCountryName] : [];
    }
    return pickerCountryOptions(countries, teamCountryNames);
  }, [scopeReady, workingCountryName, countries, teamCountryNames]);
  useReportStaleCountryPick(countryOptions, countryCandidate, selectedCountry);

  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>("A1");

  // Restore filters from sessionStorage after mount, to avoid an SSR/client
  // hydration mismatch. `initial` wins over what was saved.
  useEffect(() => {
    const storedFilters = readStoredFilters(persistKey);
    // Country lives in the working-country cookie. Do not restore it from
    // session here: on the first mount `teamCountries` is still empty, so a
    // leftover "Venezuela" would look like an unscoped pick and pin Detection
    // after Map already switched to All Countries.
    if (storedFilters.regionId !== undefined && !initial?.locationId) setSelectedRegionId(storedFilters.regionId ?? null);
    if (storedFilters.date && !(initial?.from && initial.to)) setSelectedDate(storedFilters.date);
    if (storedFilters.severities) setActiveSeverities(new Set(storedFilters.severities));
    if (storedFilters.typeFilters) setSelectedTypeFilters(storedFilters.typeFilters);
    if (storedFilters.sources !== undefined) {
      setActiveSources(storedFilters.sources ? new Set(storedFilters.sources) : null);
    }
    if (storedFilters.boundaryLevel) setBoundaryLevel(storedFilters.boundaryLevel);
    setStorageReady(true);
    // Mount-only restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // An Agent navigation deep link, after the stored defaults so it wins. A
  // fresh move applies its filters like picking them by hand (a new country
  // resets the region); a revisit (details and back, a reload, Back) brings
  // back the filters chosen during that visit. From then on they are
  // ordinary filter state; only the country stays in the URL, as this
  // visit's override, and a region it set goes with it.
  const linkedRegionRef = useRef(false);
  useAgentDeepLink({
    path: agentDeepLinkPath ?? "",
    params: agentDeepLinkPath ? DETECTION_DEEP_LINK_PARAMS : NO_PARAMS,
    oneShot: agentDeepLinkPath ? DETECTION_ONE_SHOT_PARAMS : NO_PARAMS,
    scope: linkScope,
    apply: (fresh) => {
      if (linkScope.status !== "honoured") return;
      if (!fresh) {
        const visit = readStoredFilters(LINK_FILTERS_STORAGE_KEY);
        if (visit.countryId !== detectionDeepLink.countryId) return;
        setSelectedRegionId(visit.regionId ?? null);
        linkedRegionRef.current = !!visit.regionId;
        if (visit.date) setSelectedDate(visit.date);
        if (visit.severities) setActiveSeverities(new Set(visit.severities));
        if (visit.typeFilters) setSelectedTypeFilters(visit.typeFilters);
        if (visit.sources !== undefined) setActiveSources(visit.sources ? new Set(visit.sources) : null);
        if (visit.boundaryLevel) setBoundaryLevel(visit.boundaryLevel);
        return;
      }
      setSelectedRegionId(linkScope.region?.id ?? null);
      linkedRegionRef.current = !!linkScope.region;
      if (detectionDeepLink.date) setSelectedDate(detectionDeepLink.date);
      if (detectionDeepLink.severities) setActiveSeverities(new Set(detectionDeepLink.severities));
    },
    onGone: () => {
      if (linkedRegionRef.current) setSelectedRegionId(null);
      linkedRegionRef.current = false;
    },
  });

  // Mirror filter selections into sessionStorage so they survive navigating
  // to a signal/event detail page and back (that route change unmounts the
  // page, resetting the useState defaults above without this). During a
  // deep-linked visit they go under the link instead: they hold for that
  // visit and never become the page's defaults.
  useEffect(() => {
    if (!storageReady || linkScope.status === "pending") return;
    try {
      const toStore: StoredFilters = {
        country: selectedCountry,
        regionId: selectedRegionId,
        date: selectedDate,
        severities: Array.from(activeSeverities),
        typeFilters: selectedTypeFilters,
        sources: activeSources ? Array.from(activeSources) : null,
        boundaryLevel,
      };
      if (linkScope.status === "honoured") {
        sessionStorage.setItem(
          LINK_FILTERS_STORAGE_KEY,
          JSON.stringify({ ...toStore, countryId: detectionDeepLink.countryId }),
        );
      } else {
        sessionStorage.setItem(persistKey, JSON.stringify(toStore));
      }
    } catch {
      /* sessionStorage unavailable (SSR or private mode) */
    }
  }, [storageReady, linkScope.status, detectionDeepLink.countryId, persistKey, selectedCountry, selectedRegionId, selectedDate, activeSeverities, selectedTypeFilters, activeSources, boundaryLevel]);

  const selectedLocationId = useMemo(
    () => areaOverride ?? selectedRegionId ?? getLocationId(selectedCountry),
    [areaOverride, selectedCountry, selectedRegionId, getLocationId],
  );

  // Don't fire feed queries until the location tree has loaded. Without this
  // guard, the queries fire with locationId=undefined (no filter) during the
  // brief window before the tree resolves, returning results from all countries.
  const locationsReady = !isLocationsLoading || !!selectedLocationId;

  const currentCountryStates = useMemo(
    () => tree.find((c) => c.name === selectedCountry)?.states ?? [],
    [tree, selectedCountry],
  );

  const dateRange = useMemo(() => parseDateFilter(selectedDate), [selectedDate]);
  const fromIso = useMemo(() => customRange?.from ?? dateRange.start.toISOString(), [customRange, dateRange]);
  const toIso = useMemo(() => customRange?.to ?? dateRange.end.toISOString(), [customRange, dateRange]);

  // Snapshot time: freezes the upper bound of all feed queries so that new
  // items arriving mid-session don't shift offsets and cause duplicates when
  // the user loads more. Resets whenever filters change.
  const [snapshotTime, setSnapshotTime] = useState(() => new Date().toISOString());
  const refreshSnapshot = useCallback(() => setSnapshotTime(new Date().toISOString()), []);
  // Rolling presets ("Last N days") follow snapshotTime so refresh expands
  // the window to include new events. Fixed-range presets ("Mon YYYY") and
  // a custom window keep their explicit upper bound - snapshotTime is
  // irrelevant there because the range is fixed.
  const isRollingPreset = !customRange && /^Last \d+ days?$/i.test(selectedDate);
  const effectiveTo = isRollingPreset ? snapshotTime : toIso;

  const { severityMin, severityMax } = useMemo(() => {
    if (activeSeverities.size === 0 || activeSeverities.size === 4) {
      return { severityMin: undefined, severityMax: undefined };
    }
    const nums = [...activeSeverities].map((s) => SEV_NUM[s]).filter((n): n is number => typeof n === "number");
    if (nums.length === 0) return { severityMin: undefined, severityMax: undefined };
    const min = Math.min(...nums) === 2 ? 1 : Math.min(...nums);
    return { severityMin: min, severityMax: Math.max(...nums) };
  }, [activeSeverities]);

  // Changes when the scope the feeds query changes: resets their paging.
  // Sources are left out: only the signal feeds filter on them.
  const filterKey = JSON.stringify([selectedLocationId, fromIso, toIso, activeTeamId, severityMin, severityMax, expandedTypeCodes?.join(",")]);

  // A new scope means a new frozen window, so the user sees results from the
  // correct time range.
  useEffect(() => {
    setSnapshotTime(new Date().toISOString());
  }, [filterKey, activeSources]);

  const filter: DetectionFeedFilter = {
    teamId: activeTeamId,
    locationId: selectedLocationId ?? undefined,
    from: fromIso,
    to: effectiveTo,
    severityMin,
    severityMax,
    eventTypes: expandedTypeCodes ?? undefined,
  };

  return {
    // FilterBar
    country: selectedCountry,
    onCountryChange: handleCountryChange,
    countryOptions,
    regionStates: currentCountryStates,
    regionId,
    onRegionChange: handleRegionChange,
    date: selectedDate,
    onDateChange: handleDateChange,
    dateOptions: localizedDateOptions,
    customRange,
    setCustomRange,
    // Filter popover
    severities: activeSeverities,
    setSeverities: setActiveSeverities,
    typeFilters: selectedTypeFilters,
    setTypeFilters: setSelectedTypeFilters,
    hierarchy,
    expandedTypeCodes,
    sources: activeSources,
    setSources: setActiveSources,
    // Map
    boundaryLevel,
    setBoundaryLevel,
    teamCountries,
    scopeReady,
    getLocationId,
    getCenter,
    getZoom,
    // Scope
    teamId: activeTeamId,
    selectedLocationId,
    locationsReady,
    fromIso,
    effectiveTo,
    severityMin,
    severityMax,
    snapshotTime,
    refreshSnapshot,
    filter,
    filterKey,
  };
}

export type DetectionFilters = ReturnType<typeof useDetectionFilters>;
