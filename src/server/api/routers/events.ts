import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlEvent } from "~/lib/types/graphql";

const LOCATION_FIELDS = `
  id name level geoId ancestorIds geometry population
  metadata { type data }
  ancestors { id name level population metadata { type data } }
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
  generalLocation { ${LOCATION_FIELDS} }
  originLocation { ${LOCATION_FIELDS} }
  destinationLocation { ${LOCATION_FIELDS} }
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

const EVENT_GET_QUERY = `
  query Event($id: String!) {
    event(id: $id) {
      ${EVENT_FIELDS}
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
      const [eventsData, typesData] = await Promise.all([
        graphqlFetch<{ events: GqlEvent[] }>(
          EVENT_LIST_QUERY,
          { teamId: input.teamId ?? undefined, includeDummy: false },
          cookieHeaders(ctx),
        ),
        graphqlFetch<{ disasterTypes: { glideNumber: string; level2: string }[] }>(
          DISASTER_TYPES_QUERY,
          {},
          cookieHeaders(ctx),
        ),
      ]);

      const allEvents = eventsData.events;
      const current = allEvents.find((e) => e.id === input.id);
      if (!current) return [];

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

      const currentTime = new Date(current.validFrom).getTime();
      const fiveDays = 5 * 24 * 60 * 60 * 1000;

      return allEvents.filter((e) => {
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
