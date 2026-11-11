import { describe, expect, it } from "vitest";
import { expandSelectionsToCodes, type HierarchyLevel1 } from "~/components/disaster-type-picker";
import {
  SEVERITIES,
  barHeights,
  dateKeyOf,
  dateOfKey,
  barIndexOf,
  moveHandle,
  nearestHandle,
  rangeForDays,
  rangeToDate,
  inPlaces,
  involvesState,
  isDimActive,
  isL1Checked,
  isStatePartial,
  matchesText,
  normalizeText,
  normalizeTypeKeys,
  parseQuery,
  parseSinceDays,
  passes,
  pickSeverity,
  placeName,
  placeState,
  stateFor,
  toggleInSet,
  toggleLocation,
  toggleTypeKey,
  typeLeaves,
  typeSelectionLabels,
  type FeedItem,
  type FilterState,
  type RegionState,
} from "./detection-model";

const H: HierarchyLevel1[] = [
  { name: "Conflict", groups: [{ name: "battles", codes: ["ba"] }, { name: "riots", codes: ["ri"] }] },
  { name: "Flood", groups: [{ name: "flood", codes: ["fl"] }] },
];

const item = (over: Partial<FeedItem> = {}): FeedItem => ({
  id: "e1", kind: "event", eventId: "e1", href: "/event/e1", title: "Shelling in Kadugli",
  severity: "high", isAlert: false, source: "ACLED", sources: ["ACLED"], place: "Kadugli",
  stateId: "s-sk", stateName: "South Kordofan", districtId: "d-kad", typeCodes: ["ba"], signalCount: 2,
  lastAt: "2026-11-09T10:00:00Z", firstAt: null, lng: 29.7, lat: 11, ...over,
});

const none: FilterState = { locIds: [], severities: new Set(SEVERITIES), typeFilters: [], sources: null, search: "" };

describe("event type selection", () => {
  it("checking an L1 selects all its L2s and reads as the L1", () => {
    const next = toggleTypeKey([], H, "Conflict");
    expect(next).toEqual(["Conflict::battles", "Conflict::riots"]);
    expect(isL1Checked(next, H, "Conflict")).toBe(true);
    expect(typeSelectionLabels(next, H)).toEqual(["Conflict"]);
  });

  it("clicking an L2 under a checked L1 keeps the other L2s", () => {
    const next = toggleTypeKey(["Conflict::battles", "Conflict::riots"], H, "Conflict::battles");
    expect(next).toEqual(["Conflict::riots"]);
    expect(typeSelectionLabels(next, H)).toEqual(["riots"]);
  });

  it("checking every L2 reads as the L1", () => {
    const next = toggleTypeKey(["Conflict::battles"], H, "Conflict::riots");
    expect(typeSelectionLabels(next, H)).toEqual(["Conflict"]);
  });
});

describe("passes", () => {
  it("applies places, severity, type, source and search", () => {
    expect(passes(item(), none, H)).toBe(true);
    expect(passes(item(), { ...none, locIds: ["s-nd"] }, H)).toBe(false);
    expect(passes(item(), { ...none, locIds: ["s-nd", "d-kad"] }, H)).toBe(true);
    expect(passes(item(), { ...none, severities: new Set(["critical"]) }, H)).toBe(false);
    expect(passes(item(), { ...none, typeFilters: ["Flood::flood"] }, H)).toBe(false);
    expect(passes(item(), { ...none, sources: new Set(["Dataminr"]) }, H)).toBe(false);
    expect(passes(item(), { ...none, search: "kordofan" }, H)).toBe(true);
    expect(passes(item(), { ...none, search: "zzqx" }, H)).toBe(false);
  });

  it("ignores the excepted dimension (faceted counts)", () => {
    expect(passes(item(), { ...none, locIds: ["s-nd"] }, H, "region")).toBe(true);
  });

  it("never filters signals by event type", () => {
    expect(passes(item({ kind: "signal", typeCodes: [] }), { ...none, typeFilters: ["Flood::flood"] }, H)).toBe(true);
  });
});

describe("dimension state", () => {
  it("treats all or no severities as inactive", () => {
    expect(isDimActive("sev", none)).toBe(false);
    expect(isDimActive("sev", { ...none, severities: new Set(["critical", "high"]) })).toBe(true);
  });

  it("isolates a severity picked from all, then toggles, and resets when none or all are left", () => {
    const all = new Set(SEVERITIES);
    expect([...pickSeverity(all, "high")]).toEqual(["high"]);
    expect([...pickSeverity(new Set(), "low")]).toEqual(["low"]);
    expect([...pickSeverity(new Set(["high"]), "critical")].sort()).toEqual(["critical", "high"]);
    expect([...pickSeverity(new Set(["high"]), "high")].sort()).toEqual([...SEVERITIES].sort());
    expect([...pickSeverity(new Set(["critical", "high", "medium"]), "low")].sort()).toEqual([...SEVERITIES].sort());
  });

  it("treats selecting every source as no source filter", () => {
    expect(toggleInSet(new Set(["A"]), "B", ["A", "B"])).toBeNull();
    expect(toggleInSet(null, "A", ["A", "B"])).toEqual(new Set(["A"]));
    expect(toggleInSet(new Set(["A"]), "A", ["A", "B"])).toBeNull();
  });
});

describe("date keys", () => {
  it("maps presets and custom windows both ways", () => {
    expect(dateKeyOf("Last 7 days")).toBe("7d");
    expect(dateKeyOf("Last 1 day")).toBe("24h");
    expect(dateKeyOf("Last 12 days")).toBe("c12");
    expect(dateKeyOf("Oct 2026")).toBeNull();
    expect(dateOfKey("90d")).toBe("Last 90 days");
    expect(dateOfKey("c12")).toBe("Last 12 days");
    expect(dateOfKey("c400")).toBeNull();
  });

  it("selects the last N days as bars ending today", () => {
    expect(rangeForDays(7)).toEqual([83, 89]);
    expect(rangeForDays(90)).toEqual([0, 89]);
    expect(rangeForDays(1)).toEqual([89, 89]);
  });

  it("keeps empty days visible", () => {
    expect(barHeights([0, 5, 10], 0.03)).toEqual([0.03, 0.5, 1]);
  });
});

describe("stateFor", () => {
  const states = [{ id: "s-sk", name: "South Kordofan", districts: [{ id: "d-kad", name: "Kadugli" }] }];
  it("finds the state from the location, its ancestors or its district", () => {
    expect(stateFor({ id: "s-sk", name: "South Kordofan", level: 1, geometry: null }, states)?.name).toBe("South Kordofan");
    expect(stateFor({ id: "x", name: "Kadugli town", level: 3, geometry: null, ancestorIds: ["c", "s-sk"] }, states)?.id).toBe("s-sk");
    expect(stateFor({ id: "d-kad", name: "Kadugli", level: 2, geometry: null }, states)?.id).toBe("s-sk");
    expect(stateFor(null, states)).toBeNull();
  });
});

describe("timeline range", () => {
  const start = Date.UTC(2026, 7, 13); // bar 0 = 13 Aug

  it("maps instants to bars, clamped to the window", () => {
    expect(barIndexOf("2026-08-13T10:00:00Z", start)).toBe(0);
    expect(barIndexOf("2026-08-15T23:59:59Z", start)).toBe(2);
    expect(barIndexOf("2026-01-01T00:00:00Z", start)).toBe(0);
    expect(barIndexOf("2027-01-01T00:00:00Z", start)).toBe(89);
  });

  it("grabs the nearer handle and never crosses them", () => {
    expect(nearestHandle([40, 60], 10)).toBe("start");
    expect(nearestHandle([40, 60], 70)).toBe("end");
    expect(nearestHandle([40, 60], 45)).toBe("start");
    expect(nearestHandle([40, 60], 58)).toBe("end");
    expect(moveHandle([40, 60], "start", 75)).toEqual([60, 60]);
    expect(moveHandle([40, 60], "end", 5)).toEqual([40, 40]);
    expect(moveHandle([40, 60], "end", 200)).toEqual([40, 89]);
  });

  it("turns a range ending today into last N days, others into whole days", () => {
    expect(rangeToDate([83, 89], start)).toEqual({ kind: "rolling", days: 7 });
    expect(rangeToDate([0, 2], start)).toEqual({
      kind: "custom",
      from: "2026-08-13T00:00:00.000Z",
      to: "2026-08-15T23:59:59.999Z",
    });
  });
});

describe("places", () => {
  const ND: RegionState = {
    id: "s-nd",
    name: "North Darfur",
    districts: [
      { id: "d-fasher", name: "El Fasher" },
      { id: "d-tawila", name: "Tawila" },
      { id: "d-kutum", name: "Kutum" },
    ],
  };
  const K: RegionState = { id: "s-k", name: "Kassala", districts: [{ id: "d-kassala", name: "Kassala" }] };
  const states = [ND, K];

  it("picking a state drops its districts", () => {
    expect(toggleLocation(["d-tawila", "s-k"], "s-nd", states)).toEqual(["s-k", "s-nd"]);
    expect(toggleLocation(["s-nd"], "s-nd", states)).toEqual([]);
  });

  it("picking a district of a picked state swaps the state for its other districts", () => {
    expect(toggleLocation(["s-nd"], "d-tawila", states)).toEqual(["d-fasher", "d-kutum"]);
  });

  it("picking every district collapses them back into the state", () => {
    expect(toggleLocation(["d-fasher", "d-tawila"], "d-kutum", states)).toEqual(["s-nd"]);
    expect(toggleLocation(["d-fasher"], "d-fasher", states)).toEqual([]);
  });

  it("does not collapse a state's only district into it", () => {
    expect(toggleLocation([], "d-kassala", states)).toEqual(["d-kassala"]);
  });

  it("marks a state partly picked through its districts", () => {
    expect(isStatePartial(ND, ["d-tawila"])).toBe(true);
    expect(isStatePartial(ND, ["s-nd"])).toBe(false);
    expect(involvesState(ND, ["d-tawila"])).toBe(true);
    expect(involvesState(K, ["d-tawila"])).toBe(false);
  });

  it("names and parents places", () => {
    expect(placeName("d-tawila", states)).toBe("Tawila");
    expect(placeName("s-k", states)).toBe("Kassala");
    expect(placeName("nope", states)).toBeNull();
    expect(placeState("d-kutum", states)?.id).toBe("s-nd");
    expect(placeState("s-k", states)?.id).toBe("s-k");
  });

  it("matches an item by its state or its district", () => {
    expect(inPlaces({ stateId: "s-nd", districtId: "d-tawila" }, [])).toBe(true);
    expect(inPlaces({ stateId: "s-nd", districtId: "d-tawila" }, ["d-tawila"])).toBe(true);
    expect(inPlaces({ stateId: "s-nd", districtId: "d-tawila" }, ["s-nd"])).toBe(true);
    expect(inPlaces({ stateId: "s-nd", districtId: "d-kutum" }, ["d-tawila", "s-k"])).toBe(false);
  });
});

describe("query bar text", () => {
  it("parses qualifiers and their aliases", () => {
    expect(parseQuery("in:kut")).toEqual({ key: "in", value: "kut" });
    expect(parseQuery("  District: El Fasher")).toEqual({ key: "in", value: "El Fasher" });
    expect(parseQuery("sev:")).toEqual({ key: "severity", value: "" });
    expect(parseQuery("src:acled")).toEqual({ key: "source", value: "acled" });
    expect(parseQuery("date:14")).toEqual({ key: "since", value: "14" });
  });

  it("treats unknown keys and plain words as free text", () => {
    expect(parseQuery("foo:bar")).toEqual({ key: null, value: "foo:bar" });
    expect(parseQuery(" drone strike ")).toEqual({ key: null, value: "drone strike" });
  });

  it("accepts localised keywords only in their locale", () => {
    expect(parseQuery("في:الفاشر", "ar")).toEqual({ key: "in", value: "الفاشر" });
    expect(parseQuery("في:الفاشر", "en").key).toBeNull();
    expect(parseQuery("tipo:dron", "es").key).toBe("type");
  });

  it("matches ignoring case, spaces, punctuation and accents", () => {
    expect(normalizeText("Air / Drone Strike")).toBe("airdronestrike");
    expect(matchesText("Air / Drone Strike", "dronestrike")).toBe(true);
    expect(matchesText("Sétif", "setif")).toBe(true);
    expect(matchesText("Kutum", "")).toBe(true);
    expect(matchesText("Kutum", "fash")).toBe(false);
  });

  it("reads day counts for since:, clamped to the timeline", () => {
    expect(parseSinceDays("14")).toBe(14);
    expect(parseSinceDays("14d")).toBe(14);
    expect(parseSinceDays("0")).toBe(1);
    expect(parseSinceDays("400d")).toBe(90);
    expect(parseSinceDays("week")).toBeNull();
  });
});

describe("event types: level 1 and level 3", () => {
  // As clear-api has it: conflict's ACLED groups split into detailed types,
  // every other group is a single type of the same name.
  const T: HierarchyLevel1[] = [
    {
      name: "conflict",
      groups: [
        {
          name: "explosions or remote violence",
          codes: ["rs", "rm"],
          subTypes: [
            { name: "air or drone strike", code: "rs" },
            { name: "shelling or artillery or missile attack", code: "rm" },
          ],
        },
        { name: "riots", codes: ["ri", "rd"], subTypes: [{ name: "mob violence", code: "ri" }, { name: "violent demonstration", code: "rd" }] },
      ],
    },
    {
      name: "natural hazard",
      groups: [
        { name: "flood", codes: ["fl"], subTypes: [{ name: "flood", code: "fl" }] },
        { name: "drought", codes: ["dr"], subTypes: [{ name: "drought", code: "dr" }] },
      ],
    },
    { name: "epidemic", groups: [{ name: "epidemic", codes: ["ep"], subTypes: [{ name: "epidemic", code: "ep" }] }] },
  ];
  const DRONE = "conflict::explosions or remote violence::air or drone strike";
  const SHELLING = "conflict::explosions or remote violence::shelling or artillery or missile attack";

  it("lists detailed types, keeping the group key where a group is one type", () => {
    expect(typeLeaves(T, "conflict").map((t) => t.key)).toEqual([
      DRONE,
      SHELLING,
      "conflict::riots::mob violence",
      "conflict::riots::violent demonstration",
    ]);
    expect(typeLeaves(T, "natural hazard").map((t) => [t.key, t.grouped])).toEqual([
      ["natural hazard::flood", false],
      ["natural hazard::drought", false],
    ]);
    expect(typeLeaves(T, "conflict")[0]).toMatchObject({ name: "air or drone strike", group: "explosions or remote violence", codes: ["rs"] });
  });

  it("reads an older whole-group selection as all of its detailed types", () => {
    expect(normalizeTypeKeys(["conflict::explosions or remote violence", "natural hazard::flood"], T)).toEqual([
      DRONE,
      SHELLING,
      "natural hazard::flood",
    ]);
  });

  it("toggles event types over their detailed types", () => {
    const all = toggleTypeKey([], T, "conflict");
    expect(isL1Checked(all, T, "conflict")).toBe(true);
    expect(typeSelectionLabels(all, T)).toEqual(["conflict"]);
    const withoutDrone = toggleTypeKey(all, T, DRONE);
    expect(withoutDrone).not.toContain(DRONE);
    expect(isL1Checked(withoutDrone, T, "conflict")).toBe(false);
    // Unticking one type inside an old whole-group pick keeps the group's others.
    expect(toggleTypeKey(["conflict::explosions or remote violence"], T, DRONE)).toEqual([SHELLING]);
  });

  it("labels a lone detailed type by its own name", () => {
    expect(typeSelectionLabels([DRONE], T)).toEqual(["air or drone strike"]);
    expect(typeSelectionLabels(["natural hazard::flood"], T)).toEqual(["flood"]);
  });

  it("expands detailed types and groups to their codes", () => {
    expect(expandSelectionsToCodes([DRONE], T)).toEqual(["rs"]);
    expect(expandSelectionsToCodes(["conflict::explosions or remote violence"], T).sort()).toEqual(["rm", "rs"]);
    expect(expandSelectionsToCodes(["natural hazard::flood", "conflict::riots::nope"], T)).toEqual(["fl"]);
  });
});
