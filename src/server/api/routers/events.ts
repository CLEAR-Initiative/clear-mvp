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
  query { disasterTypes { glideNumber level2 } }
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

      const codeToL2 = new Map(typesData.disasterTypes.map((t) => [t.glideNumber, t.level2]));
      // Use only the primary (first) type for matching - secondary types like "ce"
      // (complex emergency) are catch-all tags applied to most events and would
      // otherwise cause false matches across unrelated disaster categories.
      const primaryCode = current.types?.[0];
      const primaryL2 = primaryCode ? codeToL2.get(primaryCode) ?? null : null;

      const currentLoc = current.generalLocation ?? current.originLocation ?? current.destinationLocation;
      const a2Id = currentLoc?.level === 2
        ? currentLoc.id
        : currentLoc?.ancestors?.find((a) => a.level === 2)?.id ?? null;

      const currentTime = new Date(current.validFrom).getTime();
      const fiveDays = 5 * 24 * 60 * 60 * 1000;

      return allEvents.filter((e) => {
        if (e.id === input.id) return false;
        if (Math.abs(new Date(e.validFrom).getTime() - currentTime) > fiveDays) return false;
        if (primaryL2) {
          const shared = (e.types ?? []).some((c) => codeToL2.get(c) === primaryL2);
          if (!shared) return false;
        }
        if (a2Id) {
          const eLoc = e.generalLocation ?? e.originLocation ?? e.destinationLocation;
          const eA2Id = eLoc?.level === 2 ? eLoc.id : eLoc?.ancestors?.find((a) => a.level === 2)?.id;
          if (eA2Id !== a2Id) return false;
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
