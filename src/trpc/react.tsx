"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { httpBatchLink, httpLink, loggerLink, splitLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "~/server/api/root";
import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    return createQueryClient();
  }
  clientQueryClientSingleton ??= createQueryClient();
  return clientQueryClientSingleton;
};

export const api = createTRPCReact<AppRouter>();

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        // httpBatchLink waits for all procedures in a batch to finish
        // before sending the response, vs httpBatchStreamLink which
        // streams each procedure's result as it completes. We hit a
        // case at non-English locales where the slow procedures
        // (locations.tree + signals.get) had their stream chunks
        // dropped — fast procedures arrived but the slow ones never
        // resolved on the client, leaving React Query stuck in
        // isLoading forever. Switching to httpBatchLink trades the
        // streaming progressiveness for guaranteed delivery.
        //
        // The catch is that a batch resolves only when its slowest
        // procedure does. A query that gates first paint passes
        // `trpc: { context: { skipBatch: true } }` to get its own
        // request, so it isn't held behind heavy siblings.
        splitLink({
          condition: (op) => op.context.skipBatch === true,
          true: httpLink(linkOptions()),
          false: httpBatchLink(linkOptions()),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

const linkOptions = () => ({
  transformer: SuperJSON,
  url: getBaseUrl() + "/api/trpc",
  headers: () => {
    const headers = new Headers();
    headers.set("x-trpc-source", "nextjs-react");
    return headers;
  },
});

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
