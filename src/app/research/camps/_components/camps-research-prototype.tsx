"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import type { CampsResearchSite, CampsReviewStatus } from "~/lib/research/camps-mock";

type ApiPayload = {
  meta: {
    researchOnly: boolean;
    officialFixtureLoaded: boolean;
    fixturePathHint: string;
    warning: string;
  };
  sites: CampsResearchSite[];
};

const STATUS_OPTIONS: { value: CampsReviewStatus; label: string }[] = [
  { value: "needs_review", label: "Needs review" },
  { value: "imagery_ok", label: "Imagery OK" },
  { value: "imagery_inconclusive", label: "Imagery inconclusive" },
  { value: "partner_fresh", label: "Partner fresh" },
  { value: "demoted_stale", label: "Demoted (stale)" },
];

function statusColor(status: CampsReviewStatus): string {
  switch (status) {
    case "partner_fresh":
    case "imagery_ok":
      return "teal";
    case "needs_review":
      return "yellow";
    case "imagery_inconclusive":
      return "orange";
    case "demoted_stale":
      return "gray";
    default:
      return "gray";
  }
}

export function CampsResearchPrototype() {
  const [data, setData] = useState<ApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>("needs_review");
  const [overrides, setOverrides] = useState<Record<string, CampsReviewStatus>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/research/camps");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as ApiPayload;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sites = useMemo(() => {
    if (!data) return [];
    return data.sites.map((s) => ({
      ...s,
      reviewStatus: overrides[s.id] ?? s.reviewStatus,
    }));
  }, [data, overrides]);

  const visible = useMemo(() => {
    if (!filter) return sites;
    return sites.filter((s) => s.reviewStatus === filter);
  }, [sites, filter]);

  const queueCount = sites.filter((s) => s.reviewStatus === "needs_review").length;

  return (
    <Box p="lg" maw={1100} mx="auto">
      <Stack gap="md">
        <div>
          <Title order={2}>Camps research — review queue</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Throwaway prototype for Expo #319. Not a production Layers item.
            Dev / <code>ENABLE_CAMPS_RESEARCH=1</code> only. Labels are
            “observed as of”, never “live”.
          </Text>
        </div>

        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text size="sm">
              <strong>Queue:</strong> {queueCount} need review · {sites.length}{" "}
              total loaded
            </Text>
            {data && (
              <Text size="sm" c={data.meta.officialFixtureLoaded ? "teal" : "dimmed"}>
                Official fixture:{" "}
                {data.meta.officialFixtureLoaded
                  ? "loaded from .local/"
                  : `not found — add ${data.meta.fixturePathHint}`}
              </Text>
            )}
            <Text size="xs" c="orange">
              {data?.meta.warning ??
                "Precise official coordinates must stay gitignored."}
            </Text>
          </Stack>
        </Paper>

        <Group>
          <Select
            label="Filter status"
            clearable
            data={STATUS_OPTIONS}
            value={filter}
            onChange={setFilter}
            w={260}
          />
          <Button
            variant="default"
            mt={24}
            onClick={() => {
              setOverrides({});
              setFilter("needs_review");
            }}
          >
            Reset local overrides
          </Button>
        </Group>

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        {!data && !error && <Text size="sm">Loading…</Text>}

        {data && (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Site</Table.Th>
                <Table.Th>Class</Table.Th>
                <Table.Th>Observed as of</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Confidence</Table.Th>
                <Table.Th>Review</Table.Th>
                <Table.Th>Coords</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visible.map((site) => (
                <Table.Tr key={site.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {site.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {site.state} · {site.locality}
                      {site.fromOfficialFixture ? " · official fixture" : ""}
                    </Text>
                    {site.notes && (
                      <Text size="xs" c="dimmed" mt={2}>
                        {site.notes}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="sm">
                      {site.siteClass}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{site.asOf}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{site.source}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      color={
                        site.confidence === "high"
                          ? "teal"
                          : site.confidence === "medium"
                            ? "yellow"
                            : "gray"
                      }
                    >
                      {site.confidence}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Select
                      size="xs"
                      data={STATUS_OPTIONS}
                      value={site.reviewStatus}
                      onChange={(v) => {
                        if (!v) return;
                        setOverrides((prev) => ({
                          ...prev,
                          [site.id]: v as CampsReviewStatus,
                        }));
                      }}
                      w={180}
                    />
                    <Badge
                      mt={6}
                      size="xs"
                      color={statusColor(site.reviewStatus)}
                      variant="dot"
                    >
                      {site.reviewStatus}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" ff="monospace">
                      {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        {data && visible.length === 0 && (
          <Text size="sm" c="dimmed">
            No sites match this filter.
          </Text>
        )}
      </Stack>
    </Box>
  );
}
