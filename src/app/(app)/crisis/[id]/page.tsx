"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Box, Loader, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { CrisisDetailContent } from "~/components/crisis-detail/crisis-detail-content";
import type { GqlCrisisEnrichmentStatus } from "~/server/api/routers/crises";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90_000;

function enrichmentPending(
  status: GqlCrisisEnrichmentStatus | null | undefined,
): boolean {
  if (!status) return false;
  return status.title === null && status.scenarios === null;
}

function EnrichmentLoadingScreen({ referrer }: { referrer: string }) {
  const t = useTranslations("crisisDetail");
  const backHref = referrer === "map" ? "/map" : "/insights";
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
          href={backHref}
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
  const searchParams = useSearchParams();
  const [pollingStopped, setPollingStopped] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track where user came from (map or insights)
  const referrer = searchParams.get("from") ?? "insights";

  // Slim status first — polls cheaply while enrichment runs. Seeded by
  // createFromEvents so post-create navigation skips a fat get.
  const statusQuery = api.crises.enrichmentStatus.useQuery(
    { id },
    {
      enabled: !!id,
      refetchInterval: (query) => {
        if (pollingStopped) return false;
        if (enrichmentPending(query.state.data)) return POLL_INTERVAL_MS;
        return false;
      },
    },
  );

  const isEnriching =
    !pollingStopped && enrichmentPending(statusQuery.data);
  const canLoadFull =
    !!id &&
    !!statusQuery.data &&
    (pollingStopped || !enrichmentPending(statusQuery.data));

  const crisisQuery = api.crises.get.useQuery(
    { id },
    {
      enabled: canLoadFull,
    },
  );

  // Start a 90s safety timeout once we detect enrichment is pending
  useEffect(() => {
    if (!enrichmentPending(statusQuery.data)) return;
    if (timeoutRef.current) return; // already started
    timeoutRef.current = setTimeout(() => setPollingStopped(true), POLL_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [statusQuery.data]);

  const relatedQuery = api.crises.list.useQuery(undefined, {
    enabled: canLoadFull && !isEnriching,
  });
  const related = (relatedQuery.data ?? []).filter((c) => c.id !== id);

  if (statusQuery.isLoading && !statusQuery.data) {
    return (
      <CrisisDetailContent
        crisis={null}
        loading={true}
        mode="page"
        relatedCrises={[]}
        referrer={referrer}
      />
    );
  }

  if (isEnriching) {
    return <EnrichmentLoadingScreen referrer={referrer} />;
  }

  if (crisisQuery.isLoading && !crisisQuery.data) {
    return (
      <CrisisDetailContent
        crisis={null}
        loading={true}
        mode="page"
        relatedCrises={[]}
        referrer={referrer}
      />
    );
  }

  return (
    <CrisisDetailContent
      crisis={crisisQuery.data ?? null}
      loading={false}
      mode="page"
      relatedCrises={related}
      referrer={referrer}
    />
  );
}
