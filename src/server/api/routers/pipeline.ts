import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch } from "~/server/api/graphql";

/* ─── GraphQL types for data sources ─── */

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

const SIGNALS_COUNT_QUERY = `
  query Signals {
    signals {
      id
      source { id }
    }
  }
`;

export const pipelineRouter = createTRPCRouter({
  getSources: publicProcedure.query(async () => {
    const data = await graphqlFetch<{ dataSources: GqlDataSourceFull[] }>(
      DATA_SOURCES_QUERY,
    );
    // Map to shape expected by consumers (DjangoPipelineSource-compatible)
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

  getStatistics: publicProcedure.query(async () => {
    const [sourcesData, signalsData] = await Promise.all([
      graphqlFetch<{ dataSources: GqlDataSourceFull[] }>(DATA_SOURCES_QUERY),
      graphqlFetch<{ signals: Array<{ id: string; source: { id: string } | null }> }>(
        SIGNALS_COUNT_QUERY,
      ),
    ]);

    const totalSources = sourcesData.dataSources.length;
    const totalDetections = signalsData.signals.length;

    // Count signals per source type
    const byType: Record<string, { variables: number; data_records: number }> = {};
    for (const ds of sourcesData.dataSources) {
      const count = signalsData.signals.filter(
        (d) => d.source?.id === ds.id,
      ).length;
      byType[ds.type] = byType[ds.type] ?? { variables: 0, data_records: 0 };
      byType[ds.type]!.data_records += count;
    }

    // Count recent detections (last 24h)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentCount = totalDetections; // All detections as proxy for recent data

    return {
      success: true,
      period: {
        start_date: new Date(oneDayAgo).toISOString(),
        end_date: new Date().toISOString(),
        days: 1,
      },
      overall: {
        total_sources: totalSources,
        total_variables: 0,
        total_data_records: totalDetections,
        recent_data_count: recentCount,
      },
      by_source: {},
      by_type: byType,
      tasks: {
        total_tasks: 0,
        total_success: 0,
        total_failures: 0,
        avg_duration: 0,
      },
    };
  }),
});
