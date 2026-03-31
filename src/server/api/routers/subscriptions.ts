import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";

interface GqlAlertSubscription {
  id: string;
  userId: string;
  alertType: string;
  active: boolean;
  channel: string;
  frequency: string;
  createdAt: string;
  location: { id: string; name: string; level: number };
}

const MY_SUBSCRIPTIONS_QUERY = `
  query MyAlertSubscriptions {
    myAlertSubscriptions {
      id
      userId
      alertType
      active
      channel
      frequency
      createdAt
      location { id name level }
    }
  }
`;

const SUBSCRIBE_MUTATION = `
  mutation SubscribeToAlerts($input: SubscribeToAlertsInput!) {
    subscribeToAlerts(input: $input) {
      id
      alertType
      active
      channel
      frequency
      location { id name level }
    }
  }
`;

const UPDATE_SUBSCRIPTION_MUTATION = `
  mutation UpdateAlertSubscription($id: String!, $input: UpdateAlertSubscriptionInput!) {
    updateAlertSubscription(id: $id, input: $input) {
      id
      active
      channel
      frequency
    }
  }
`;

const UNSUBSCRIBE_MUTATION = `
  mutation UnsubscribeFromAlerts($id: String!) {
    unsubscribeFromAlerts(id: $id)
  }
`;

const DISASTER_TYPES_QUERY = `
  query DisasterTypes {
    disasterTypes { id disasterType glideNumber }
  }
`;

const LOCATIONS_QUERY = `
  query Locations {
    locations { id name level }
  }
`;

export const subscriptionsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ myAlertSubscriptions: GqlAlertSubscription[] }>(
      MY_SUBSCRIPTIONS_QUERY,
      undefined,
      cookieHeaders(ctx),
    );
    return data.myAlertSubscriptions;
  }),

  subscribe: protectedProcedure
    .input(
      z.object({
        locationId: z.string(),
        alertType: z.string(),
        severity: z.array(z.string()).optional(),
        channel: z.enum(["email", "sms"]),
        frequency: z.enum(["immediately", "daily", "weekly", "monthly"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { severity: _severity, ...gqlInput } = input;
      const data = await graphqlFetch<{ subscribeToAlerts: GqlAlertSubscription }>(
        SUBSCRIBE_MUTATION,
        { input: gqlInput },
        cookieHeaders(ctx),
      );
      return data.subscribeToAlerts;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        channel: z.enum(["email", "sms"]).optional(),
        frequency: z.enum(["immediately", "daily", "weekly", "monthly"]).optional(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const data = await graphqlFetch<{ updateAlertSubscription: GqlAlertSubscription }>(
        UPDATE_SUBSCRIPTION_MUTATION,
        { id, input: rest },
        cookieHeaders(ctx),
      );
      return data.updateAlertSubscription;
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ unsubscribeFromAlerts: boolean }>(
        UNSUBSCRIBE_MUTATION,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.unsubscribeFromAlerts;
    }),

  /** Fetch disaster types for the subscription form dropdown */
  disasterTypes: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{
      disasterTypes: Array<{ id: string; disasterType: string; glideNumber: string }>;
    }>(DISASTER_TYPES_QUERY, undefined, cookieHeaders(ctx));
    return data.disasterTypes;
  }),

  /** Fetch locations for the subscription form dropdown */
  locations: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{
      locations: Array<{ id: string; name: string; level: number }>;
    }>(LOCATIONS_QUERY, undefined, cookieHeaders(ctx));
    return data.locations;
  }),
});
