import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlEvent } from "~/lib/types/graphql";

const LOCATION_FIELDS = `
  id name level geoId ancestorIds geometry population
  parent { id name }
  metadata { type data }
  ancestors { id name level population metadata { type data } }
`;

// Slim location shape for the event detail page's get-by-id query. We
// drop the recursive ancestors walk (with per-ancestor metadata) because
// it pushes the response over the SSH tunnel's effective throughput
// when admin polygons are large — 3 locations × ~4 ancestors × full
// metadata at ar locale was causing 5-minute fetch failures.
//
// Trade-off: the IDP-displacement fallback on event detail (lines
// 220-238 of event-detail-content.tsx) walks `loc.ancestors[*].metadata`
// for `iom_dtm_displacement`. With this slim shape the fallback only
// finds the metadata when it's on the event's *direct* location, not
// when only an ancestor has it. Acceptable degradation in exchange for
// the page actually loading.
const EVENT_DETAIL_LOCATION_FIELDS = `
  id name level geoId ancestorIds geometry population
  parent { id name }
  metadata { type data }
`;

// Signal locations on the event-detail page are only used to plot
// map points (event-detail-content.tsx reads `loc.geometry`/`name` and
// nothing else from signal locations). Fetching the full LOCATION_FIELDS
// per signal (ancestors with metadata, parent, population, etc.) ×3
// per signal ×N signals exploded the resolver fan-out at non-English
// locales and stalled the detail page. The event's *own* location keeps
// LOCATION_FIELDS below because the IDP-displacement fallback walks
// `event.generalLocation.ancestors[*].metadata`.
const SIGNAL_LOCATION_FIELDS = `
  id name level geometry
`;

const SIGNAL_FIELDS = `
  id
  source { id name type }
  title
  description
  severity
  url
  publishedAt
  collectedAt
  generalLocation { ${SIGNAL_LOCATION_FIELDS} }
  originLocation { ${SIGNAL_LOCATION_FIELDS} }
  destinationLocation { ${SIGNAL_LOCATION_FIELDS} }
`;

const EVENT_FIELDS = `
  id
  title
  description
  types
  severity
  isDummy
  rank
  validFrom
  validTo
  firstSignalCreatedAt
  lastSignalCreatedAt
  populationAffected
  casualties
  generalLocation { ${LOCATION_FIELDS} }
  originLocation { ${LOCATION_FIELDS} }
  destinationLocation { ${LOCATION_FIELDS} }
  signals { ${SIGNAL_FIELDS} }
  alerts { id status }
`;

const EVENT_LIST_QUERY = `
  query Events($teamId: String, $includeDummy: Boolean) {
    events(teamId: $teamId, includeDummy: $includeDummy) {
      ${EVENT_FIELDS}
    }
  }
`;

// Slim event shape used only by the `related` procedure. The related
// matcher reads id/types/validFrom and the (level, ancestors) of any one
// location to decide whether two events share geography; it does NOT
// render any event fields directly. Fetching the full EVENT_FIELDS for
// every event in the system (hundreds–thousands of rows × translation
// loader + per-location geometry/ancestors) was wedging detail-page
// loads at non-English locales. Keep this in sync with the matcher
// logic in `related:` below.
const EVENT_RELATED_PAGE_QUERY = `
  query EventsForRelated($input: EventsPageInput) {
    eventsPage(input: $input) {
      items {
        id
        types
        validFrom
        generalLocation { id level ancestors { id level } }
        originLocation { id level ancestors { id level } }
        destinationLocation { id level ancestors { id level } }
      }
    }
  }
`;

// Current event lookup for the `related` matcher: we need its
// validFrom (to centre the time window), its types (to match disaster
// category), and one location with ancestors (to derive the geo
// anchor). Avoids re-finding it inside the windowed result, which
// would force us to include the centre event in the window query.
const CURRENT_EVENT_FOR_RELATED = `
  query CurrentEventForRelated($id: String!) {
    event(id: $id) {
      id
      types
      validFrom
      generalLocation { id level ancestors { id level } }
      originLocation { id level ancestors { id level } }
      destinationLocation { id level ancestors { id level } }
    }
  }
`;

// Slim EVENT_FIELDS variant for the event detail page. Substitutes
// EVENT_DETAIL_LOCATION_FIELDS (no recursive ancestors walk) for the
// 3 event-level location fields. Everything else identical. See the
// rationale on EVENT_DETAIL_LOCATION_FIELDS.
const EVENT_DETAIL_FIELDS = `
  id
  title
  description
  types
  severity
  isDummy
  rank
  validFrom
  validTo
  firstSignalCreatedAt
  lastSignalCreatedAt
  populationAffected
  casualties
  generalLocation { ${EVENT_DETAIL_LOCATION_FIELDS} }
  originLocation { ${EVENT_DETAIL_LOCATION_FIELDS} }
  destinationLocation { ${EVENT_DETAIL_LOCATION_FIELDS} }
  signals { ${SIGNAL_FIELDS} }
  alerts { id status }
`;

const EVENT_GET_QUERY = `
  query Event($id: String!) {
    event(id: $id) {
      ${EVENT_DETAIL_FIELDS}
    }
  }
`;

const DISASTER_TYPES_QUERY = `
  query { disasterTypes { glideNumber level1 } }
`;

const CREATE_EVENT_MUTATION = `
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      ${EVENT_FIELDS}
    }
  }
`;

export const eventsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ teamId: z.string().nullish(), includeDummy: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ events: GqlEvent[] }>(
        EVENT_LIST_QUERY,
        {
          ...(input?.teamId ? { teamId: input.teamId } : {}),
          includeDummy: input?.includeDummy ?? false,
        },
        cookieHeaders(ctx),
      );
      return data.events;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ event: GqlEvent | null }>(
        EVENT_GET_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.event;
    }),

  related: protectedProcedure
    .input(z.object({ id: z.string(), teamId: z.string().nullish() }))
    .query(async ({ ctx, input }) => {
      // First fetch the current event by id (cheap, one row) so we can
      // centre the ±5d window on its validFrom. Doing this server-side
      // instead of having the caller pass validFrom keeps the public
      // procedure shape unchanged and avoids the detail page needing
      // to gate this query on its sibling `get` query.
      const currentData = await graphqlFetch<{ event: GqlEvent | null }>(
        CURRENT_EVENT_FOR_RELATED,
        { id: input.id },
        cookieHeaders(ctx),
      );
      const current = currentData.event;
      if (!current) return [];

      const currentTime = new Date(current.validFrom).getTime();
      const fiveDays = 5 * 24 * 60 * 60 * 1000;
      // Pass the window to the API via eventsPage's from/to filter,
      // which translates to `firstSignalCreatedAt BETWEEN ...`. That's a
      // close-enough proxy for validFrom in practice (the first signal
      // typically lands within a day of the event start); the JS filter
      // below tightens it to a strict validFrom comparison anyway.
      const from = new Date(currentTime - fiveDays).toISOString();
      const to = new Date(currentTime + fiveDays).toISOString();

      const [eventsData, typesData] = await Promise.all([
        graphqlFetch<{ eventsPage: { items: GqlEvent[] } }>(
          EVENT_RELATED_PAGE_QUERY,
          {
            input: {
              teamId: input.teamId ?? undefined,
              includeDummy: false,
              from,
              to,
              limit: 500,
            },
          },
          cookieHeaders(ctx),
        ),
        graphqlFetch<{ disasterTypes: { glideNumber: string; level1: string }[] }>(
          DISASTER_TYPES_QUERY,
          {},
          cookieHeaders(ctx),
        ),
      ]);

      const candidates = eventsData.eventsPage.items;

      const codeToL1 = new Map(typesData.disasterTypes.map((t) => [t.glideNumber, t.level1]));
      // Use only the primary (first) type for matching - secondary types like "ce"
      // (complex emergency) are catch-all tags applied to most events and would
      // otherwise cause false matches across unrelated disaster categories.
      const primaryCode = current.types?.[0];
      const primaryL1 = primaryCode ? codeToL1.get(primaryCode) ?? null : null;

      // Resolve the best available geography anchor for the current event:
      // prefer A2 (district), fall back to A1 (state) if A2 is absent in the data.
      const currentLoc = current.generalLocation ?? current.originLocation ?? current.destinationLocation;
      let geoId: string | null = null;
      let geoLevel: number | null = null;
      if (currentLoc) {
        const ancestors = currentLoc.ancestors ?? [];
        if (currentLoc.level === 2) {
          geoId = currentLoc.id; geoLevel = 2;
        } else if (currentLoc.level === 1) {
          geoId = currentLoc.id; geoLevel = 1;
        } else {
          const a2 = ancestors.find((a) => a.level === 2);
          const a1 = ancestors.find((a) => a.level === 1);
          if (a2) { geoId = a2.id; geoLevel = 2; }
          else if (a1) { geoId = a1.id; geoLevel = 1; }
        }
      }

      return candidates.filter((e) => {
        if (e.id === input.id) return false;
        if (Math.abs(new Date(e.validFrom).getTime() - currentTime) > fiveDays) return false;
        if (primaryL1) {
          const shared = (e.types ?? []).some((c) => codeToL1.get(c) === primaryL1);
          if (!shared) return false;
        }
        if (geoId && geoLevel) {
          const eLoc = e.generalLocation ?? e.originLocation ?? e.destinationLocation;
          if (!eLoc) return false;
          const eAncestors = eLoc.ancestors ?? [];
          const eGeoId = eLoc.level === geoLevel
            ? eLoc.id
            : eAncestors.find((a) => a.level === geoLevel)?.id ?? null;
          if (eGeoId !== geoId) return false;
        }
        return true;
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        signalIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ createEvent: GqlEvent }>(
        CREATE_EVENT_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.createEvent;
    }),
});
