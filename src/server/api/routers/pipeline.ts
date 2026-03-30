import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";

/* --- GraphQL types --- */

interface GqlDataSourceFull {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  baseUrl: string | null;
  infoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const DATA_SOURCES_QUERY = `
  query DataSources {
    dataSources {
      id
      name
      type
      isActive
      baseUrl
      infoUrl
      createdAt
      updatedAt
    }
  }
`;

const SIGNALS_STATS_QUERY = `
  query SignalsStats {
    signals {
      source { id name }
      collectedAt
    }
  }
`;

export const pipelineRouter = createTRPCRouter({
  getSources: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ dataSources: GqlDataSourceFull[] }>(
      DATA_SOURCES_QUERY,
      undefined,
      cookieHeaders(ctx),
    );
    return {
      success: true,
      sources: data.dataSources.map((ds) => ({
        id: ds.id,
        name: ds.name,
        description: ds.infoUrl,
        type: ds.type,
        data_frequency: "Real-time",
        base_url: ds.baseUrl,
        is_active: ds.isActive,
        variable_count: 0,
      })),
    };
  }),

  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const hdrs = cookieHeaders(ctx);
    const [sourcesData, signalsData] = await Promise.all([
      graphqlFetch<{ dataSources: GqlDataSourceFull[] }>(DATA_SOURCES_QUERY, undefined, hdrs),
      graphqlFetch<{ signals: Array<{ source: { id: string; name: string } | null; collectedAt: string }> }>(
        SIGNALS_STATS_QUERY,
        undefined,
        hdrs,
      ),
    ]);

    // Per-source: count + latest collectedAt
    const bySource: Record<string, { signal_count: number; latest_signal_at: string | null }> = {};

    for (const sig of signalsData.signals) {
      const name = sig.source?.name;
      if (!name) continue;
      const entry = bySource[name] ?? { signal_count: 0, latest_signal_at: null };
      entry.signal_count += 1;
      if (!entry.latest_signal_at || sig.collectedAt > entry.latest_signal_at) {
        entry.latest_signal_at = sig.collectedAt;
      }
      bySource[name] = entry;
    }

    // Ensure every registered source appears (even those with no signals yet)
    for (const ds of sourcesData.dataSources) {
      if (!bySource[ds.name]) {
        bySource[ds.name] = { signal_count: 0, latest_signal_at: null };
      }
    }

    return {
      success: true,
      overall: {
        total_sources: sourcesData.dataSources.length,
        total_signals: signalsData.signals.length,
      },
      by_source: bySource,
    };
  }),
});
