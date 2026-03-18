"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Loader,
  TextInput,
  Menu,
  ActionIcon,
} from "@mantine/core";
import {
  IconSearch,
  IconSortDescending,
  IconX,
  IconExternalLink,
} from "@tabler/icons-react";
import type { GqlSignal } from "~/lib/types/graphql";
import type { MapMarker } from "~/components/map/crisis-map";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

type SortOrder = "newest" | "oldest" | "source";

const SORT_LABELS: Record<SortOrder, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  source: "Source name",
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SignalsTabProps {
  signals: GqlSignal[];
  loading: boolean;
  mapMarkers: MapMarker[];
  mapCenter: [number, number];
  mapZoom: number;
}

export function SignalsTab({
  signals,
  loading,
  mapMarkers,
  mapCenter,
  mapZoom,
}: SignalsTabProps) {
  const [search, setSearch] = useState("");
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const allSources = useMemo(
    () => [...new Set(signals.map((s) => s.source.name))].sort(),
    [signals],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = signals.filter((s) => {
      if (activeSource !== null && s.source.name !== activeSource) return false;
      if (q) {
        const title = (s.title ?? s.description ?? "").toLowerCase();
        const loc = (s.generalLocation?.name ?? s.originLocation?.name ?? "").toLowerCase();
        const src = s.source.name.toLowerCase();
        if (!title.includes(q) && !loc.includes(q) && !src.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortOrder === "newest")
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      if (sortOrder === "oldest")
        return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      return a.source.name.localeCompare(b.source.name);
    });

    return result;
  }, [signals, search, activeSource, sortOrder]);

  const listCountLabel =
    filtered.length === signals.length
      ? String(signals.length)
      : `${filtered.length}/${signals.length}`;

  const isFiltered = search.trim() !== "" || activeSource !== null || sortOrder !== "newest";

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      {/* Left: Signal list */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        {/* Filter row */}
        <Group gap={8} mb={16}>
          <TextInput
            placeholder="Search signals..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={14} color="#A3A3A3" />}
            rightSection={
              search ? (
                <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setSearch("")}>
                  <IconX size={12} />
                </ActionIcon>
              ) : null
            }
            size="xs"
            style={{ flex: 1 }}
            styles={{ input: { fontSize: 13 } }}
          />

          {/* Source filter pills */}
          {allSources.length > 0 && (
            <Group gap={4}>
              <button
                onClick={() => setActiveSource(null)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${activeSource === null ? "#E85D3D" : "#E5E5E5"}`,
                  background: activeSource === null ? "#FEF2F0" : "#F9FAFB",
                  color: activeSource === null ? "#E85D3D" : "#737373",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                All
              </button>
              {allSources.map((src) => (
                <button
                  key={src}
                  onClick={() => setActiveSource(activeSource === src ? null : src)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: `1px solid ${activeSource === src ? "#E85D3D" : "#E5E5E5"}`,
                    background: activeSource === src ? "#FEF2F0" : "#F9FAFB",
                    color: activeSource === src ? "#E85D3D" : "#737373",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {src}
                </button>
              ))}
            </Group>
          )}

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: `1px solid ${sortOrder !== "newest" ? "#E85D3D" : "#E5E5E5"}`,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  color: sortOrder !== "newest" ? "#E85D3D" : "#525252",
                }}
              >
                <IconSortDescending size={13} />
                Sort
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              {(Object.entries(SORT_LABELS) as [SortOrder, string][]).map(([key, label]) => (
                <Menu.Item
                  key={key}
                  onClick={() => setSortOrder(key)}
                  style={{
                    fontSize: 12,
                    fontWeight: sortOrder === key ? 600 : 400,
                    color: sortOrder === key ? "#E85D3D" : "#171717",
                  }}
                >
                  {label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Signal list */}
        <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
          <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
            <Group justify="space-between">
              <Group gap={8}>
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  All Signals
                </Text>
                <Badge
                  size="xs"
                  style={{
                    background: isFiltered ? "#FEF2F0" : "#F5F5F5",
                    color: isFiltered ? "#E85D3D" : "#525252",
                    fontWeight: 600,
                  }}
                >
                  {listCountLabel}
                </Badge>
              </Group>
              {loading && <Loader size="xs" />}
            </Group>
          </Box>

          <Box style={{ maxHeight: "calc(100vh - 460px)", overflowY: "auto" }}>
            {filtered.length === 0 && !loading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="#A3A3A3" size="sm">
                  {signals.length === 0 ? "No signals found." : "No signals match your filters."}
                </Text>
              </Box>
            )}
            {filtered.map((signal) => {
              const location =
                signal.generalLocation ?? signal.originLocation ?? signal.destinationLocation;
              const displayTitle =
                signal.title ??
                (signal.description
                  ? signal.description.slice(0, 120) + (signal.description.length > 120 ? "…" : "")
                  : "Untitled signal");

              return (
                <Link
                  key={signal.id}
                  href={`/signal/${signal.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Box
                    px={16}
                    py={12}
                    className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                    style={{ display: "flex", gap: 12 }}
                  >
                    <Box
                      style={{
                        width: 3,
                        background: "#737373",
                        flexShrink: 0,
                        borderRadius: 2,
                      }}
                    />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" mb={4}>
                        <Group gap={6}>
                          <Badge
                            size="xs"
                            style={{
                              background: "#F5F5F5",
                              color: "#525252",
                              fontWeight: 600,
                            }}
                          >
                            {signal.source.name}
                          </Badge>
                          <Badge
                            size="xs"
                            variant="outline"
                            style={{ color: "#737373", borderColor: "#73737340", fontSize: 10 }}
                          >
                            {signal.source.type}
                          </Badge>
                        </Group>
                        <Text size="xs" c="#A3A3A3">
                          {formatTimeAgo(signal.publishedAt)}
                        </Text>
                      </Group>
                      <Text fw={600} size="sm" c="#171717" lineClamp={2} mb={4} style={{ lineHeight: 1.4 }}>
                        {displayTitle}
                      </Text>
                      <Group gap={12}>
                        {location && (
                          <Text size="xs" c="#737373">{location.name}</Text>
                        )}
                        <Text size="xs" c="#A3A3A3" style={{ marginLeft: "auto" }}>
                          {formatDate(signal.publishedAt)}
                        </Text>
                        {signal.url && (
                          <a
                            href={signal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: 11,
                              color: "#E85D3D",
                              textDecoration: "none",
                            }}
                          >
                            <IconExternalLink size={11} />
                            Source
                          </a>
                        )}
                      </Group>
                    </Box>
                  </Box>
                </Link>
              );
            })}
          </Box>
        </Card>
      </Box>

      {/* Right: Crisis Map */}
      <Box style={{ width: 480, flexShrink: 0 }}>
        <Card p={0} style={{ border: "1px solid #E5E5E5", position: "sticky", top: 24 }}>
          <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
            <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Crisis Map</Text>
          </Box>
          <Box style={{ height: 480 }}>
            <CrisisMap
              markers={mapMarkers}
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
            />
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
