"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Box, Loader, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { CrisisDetailContent } from "~/components/crisis-detail/crisis-detail-content";
import type { GqlCrisis } from "~/server/api/routers/crises";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90_000;

function enrichmentPending(crisis: GqlCrisis | null | undefined): boolean {
  if (!crisis) return false;
  return crisis.title === null && crisis.scenarios === null;
}

function EnrichmentLoadingScreen() {
  const t = useTranslations("crisisDetail");
  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "100vh",
        background: "var(--color-bg-primary)",
      }}
    >
      {/* Minimal header to match crisis page chrome */}
      <Box
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-white)",
          padding: "12px 24px",
        }}
      >
        <Link
          href="/insights"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
            color: "var(--color-text-muted)",
            fontSize: 13,
          }}
        >
          <IconArrowLeft size={14} />
          {t("backToAnalysis")}
        </Link>
      </Box>

      {/* Centered loading content */}
      <Box
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 48,
        }}
      >
        <Loader size="md" color="var(--color-accent)" />
        <Box style={{ textAlign: "center" }}>
          <Text fw={600} size="sm" c="var(--color-text-primary)" mb={6}>
            {t("enrichment.preparingTitle")}
          </Text>
          <Text size="xs" c="var(--color-text-muted)">
            {t("enrichment.preparingDescription")}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

export default function CrisisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [pollingStopped, setPollingStopped] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const crisisQuery = api.crises.get.useQuery(
    { id },
    {
      enabled: !!id,
      refetchInterval: (query) => {
        if (pollingStopped) return false;
        const data = query.state.data;
        if (enrichmentPending(data)) return POLL_INTERVAL_MS;
        return false;
      },
    },
  );

  // Start a 90s safety timeout once we detect enrichment is pending
  useEffect(() => {
    if (!enrichmentPending(crisisQuery.data)) return;
    if (timeoutRef.current) return; // already started
    timeoutRef.current = setTimeout(() => setPollingStopped(true), POLL_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [crisisQuery.data]);

  const relatedQuery = api.crises.list.useQuery(undefined, {
    enabled: !!crisisQuery.data && !enrichmentPending(crisisQuery.data),
  });
  const related = (relatedQuery.data ?? []).filter((c) => c.id !== id);

  const isPending = !pollingStopped && enrichmentPending(crisisQuery.data);

  if (crisisQuery.isLoading) {
    return (
      <CrisisDetailContent
        crisis={null}
        loading={true}
        mode="page"
        relatedCrises={[]}
      />
    );
  }

  if (isPending) {
    return <EnrichmentLoadingScreen />;
  }

  return (
    <CrisisDetailContent
      crisis={crisisQuery.data ?? null}
      loading={false}
      mode="page"
      relatedCrises={related}
    />
  );
}
