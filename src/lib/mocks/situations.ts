/**
 * Mock situation data.
 *
 * Shape mirrors what the backend is expected to return for a `Situation`
 * (id, severity, location, summary, needs + a title) joined with related
 * events via `event_to_situation`. Replace with real tRPC/GraphQL when
 * the backend ships the type.
 */

export interface MockSituationEvent {
  id: string;
  title: string;
  type: string;
  /** Severity on 1-5 scale (matches event.rank rounded up). */
  severity: number;
  /** ISO date string. */
  date: string;
  summary: string;
  location?: string;
}

export interface MockSituationNeed {
  /** Short label, e.g. "Shelter". */
  label: string;
  /** Severity bucket for colour-coding. */
  severity: "critical" | "high" | "medium" | "low";
  /** Optional free-text detail. */
  detail?: string;
}

export interface MockSituation {
  id: string;
  title: string;
  /** 1-5 scale. Backend sends Float; we treat it the same as event.rank. */
  severity: number;
  summary: string;
  description: string;
  location: {
    name: string;
    /** [lng, lat] */
    coordinates: [number, number];
  };
  peopleAffected: number;
  peopleDisplaced: number;
  households?: number;
  needs: MockSituationNeed[];
  /** Events contributing to this situation. Sorted newest first. */
  events: MockSituationEvent[];
  createdAt: string;
  updatedAt: string;
}

export const MOCK_SITUATIONS: MockSituation[] = [
  {
    id: "sit_001",
    title: "North Kordofan escalation - al-Obeid corridor",
    severity: 5,
    summary:
      "Sustained RSF offensive around al-Obeid over the past 10 days has triggered large-scale civilian displacement, disrupted medical services, and cut the main north-south supply corridor for humanitarian convoys.",
    description:
      "Clashes intensified on 04 April when RSF units advanced on al-Obeid from the west, targeting health infrastructure and residential areas. Local authorities report at least three hospitals damaged and primary water infrastructure compromised. Displacement is flowing east toward White Nile State and south toward South Kordofan, with secondary movement into informal settlements outside El-Rahad. NRC field teams confirm acute shortages of shelter material, potable water, and primary healthcare access in receiving areas.",
    location: {
      name: "North Kordofan, Sudan",
      coordinates: [30.2, 13.2],
    },
    peopleAffected: 412_000,
    peopleDisplaced: 78_500,
    households: 15_700,
    needs: [
      { label: "Shelter", severity: "critical", detail: "Emergency shelter for 15k+ households" },
      { label: "Health", severity: "critical", detail: "3 hospitals damaged, medical supplies depleted" },
      { label: "WASH", severity: "high", detail: "Primary water points offline" },
      { label: "Food", severity: "high", detail: "Supply corridor cut" },
      { label: "Protection", severity: "high" },
      { label: "Education", severity: "medium" },
    ],
    events: [
      {
        id: "evt_s001_06",
        title: "RSF strike on al-Obeid hospital",
        type: "Conflict",
        severity: 5,
        date: "2026-04-13T09:40:00Z",
        summary:
          "Sudan Doctors Network reports 12 injured including 5 medical personnel following RSF attack on al-Obeid Hospital.",
        location: "al-Obeid",
      },
      {
        id: "evt_s001_05",
        title: "Mass displacement wave toward White Nile",
        type: "Displacement",
        severity: 4,
        date: "2026-04-11T14:15:00Z",
        summary:
          "IOM DTM flash update estimates 22,000 newly displaced over 48 hours moving east from North Kordofan.",
        location: "White Nile border",
      },
      {
        id: "evt_s001_04",
        title: "Primary water network damage reported",
        type: "WASH",
        severity: 4,
        date: "2026-04-09T08:00:00Z",
        summary:
          "UNICEF partners confirm damage to al-Obeid water treatment, affecting an estimated 180k residents.",
        location: "al-Obeid",
      },
      {
        id: "evt_s001_03",
        title: "Supply convoy blocked on north-south corridor",
        type: "Access",
        severity: 3,
        date: "2026-04-07T11:25:00Z",
        summary:
          "WFP convoy of 14 trucks turned back at checkpoint near Umm Ruwaba. No casualties reported.",
        location: "Umm Ruwaba",
      },
      {
        id: "evt_s001_02",
        title: "RSF advance on western outskirts",
        type: "Conflict",
        severity: 4,
        date: "2026-04-05T17:00:00Z",
        summary:
          "ACLED records sustained fighting 18km west of al-Obeid. Civilian casualties reported.",
        location: "al-Obeid outskirts",
      },
      {
        id: "evt_s001_01",
        title: "Initial clashes reported",
        type: "Conflict",
        severity: 3,
        date: "2026-04-04T06:45:00Z",
        summary:
          "Local monitors report overnight exchanges of fire between RSF and SAF forces.",
        location: "al-Obeid",
      },
    ],
    createdAt: "2026-04-04T07:00:00Z",
    updatedAt: "2026-04-13T09:40:00Z",
  },
];

export function getMockSituation(id: string): MockSituation | null {
  return MOCK_SITUATIONS.find((s) => s.id === id) ?? MOCK_SITUATIONS[0] ?? null;
}
