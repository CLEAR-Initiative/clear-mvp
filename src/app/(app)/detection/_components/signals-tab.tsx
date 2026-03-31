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
  Popover,
  Menu,
  ActionIcon,
  Divider,
  Stack,
} from "@mantine/core";
import {
  IconSearch,
  IconFilter,
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
  const [activeSources, setActiveSources] = useState<Set<string> | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [filterOpen, setFilterOpen] = useState(false);

  const allSources = useMemo(
    () => [...new Set(signals.map((s) => s.source.name))].sort(),
    [signals],
  );

  function toggleSource(src: string) {
    setActiveSources((prev) => {
      const base = prev ?? new Set(allSources);
      const next = new Set(base);
      next.has(src) ? next.delete(src) : next.add(src);
      return next.size === allSources.length ? null : next;
    });
  }

  function clearFilters() {
    setSearch("");
    setActiveSources(null);
    setSortOrder("newest");
  }

  const isFiltered = search.trim() !== "" || activeSources !== null || sortOrder !== "newest";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = signals.filter((s) => {
      if (activeSources !== null && !activeSources.has(s.source.name)) return false;
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
  }, [signals, search, activeSources, sortOrder]);

  const listCountLabel =
    filtered.length === signals.length
      ? String(signals.length)
      : `${filtered.length}/${signals.length}`;

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      {/* Left: Signal list */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        {/* Toolbar row */}
        <Group gap={8} mb={12} align="center" style={{ minHeight: 32 }}>
          <Group gap={6} style={{ flexShrink: 0 }}>
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>Signals</Text>
            <Badge
              size="xs"
              style={{
                background: isFiltered ? "var(--color-accent-light)" : "var(--color-bg-muted)",
                color: isFiltered ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontWeight: 600,
              }}
            >
              {listCountLabel}
            </Badge>
            {loading && <Loader size="xs" />}
          </Group>

          <TextInput
            placeholder="Search signals..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={14} color="var(--color-text-muted)" />}
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

          <Popover
            opened={filterOpen}
            onChange={setFilterOpen}
            position="bottom-end"
            shadow="md"
            width={220}
          >
            <Popover.Target>
              <button
                onClick={() => setFilterOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  border: `1px solid ${isFiltered ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: "var(--color-bg-white)",
                  cursor: "pointer",
                  color: isFiltered ? "var(--color-accent)" : "var(--color-text-secondary)",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <IconFilter size={13} />
                {isFiltered && (
                  <Box
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                    }}
                  />
                )}
              </button>
            </Popover.Target>
            <Popover.Dropdown p={16}>
              {allSources.length > 0 && (
                <>
                  <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>Source</Text>
                  <Stack gap={4}>
                    {allSources.map((src) => {
                      const active = activeSources === null || activeSources.has(src);
                      return (
                        <button
                          key={src}
                          onClick={() => toggleSource(src)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid",
                            borderColor: active ? "color-mix(in srgb, var(--color-accent) 20%, transparent)" : "var(--color-border)",
                            background: active ? "var(--color-accent-light)" : "var(--color-bg-muted)",
                            color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {src}
                          {active && (
                            <Box style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)" }} />
                          )}
                        </button>
                      );
                    })}
                  </Stack>
                </>
              )}

              {isFiltered && (
                <>
                  <Divider color="var(--color-border)" my={10} />
                  <button
                    onClick={clearFilters}
                    style={{
                      width: "100%",
                      padding: "6px",
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg-muted)",
                      color: "var(--color-text-secondary)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Clear all filters
                  </button>
                </>
              )}
            </Popover.Dropdown>
          </Popover>

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  border: `1px solid ${sortOrder !== "newest" ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: "var(--color-bg-white)",
                  cursor: "pointer",
                  color: sortOrder !== "newest" ? "var(--color-accent)" : "var(--color-text-secondary)",
                  flexShrink: 0,
                }}
              >
                <IconSortDescending size={13} />
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
                    color: sortOrder === key ? "var(--color-accent)" : "var(--color-text-primary)",
                  }}
                >
                  {label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Signal list - no card header */}
        <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
          <Box style={{ maxHeight: "calc(100vh - 420px)", overflowY: "auto" }}>
            {filtered.length === 0 && !loading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="var(--color-text-muted)" size="sm">
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
                  ? signal.description.slice(0, 120) + (signal.description.length > 120 ? "..." : "")
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
                        background: "var(--color-text-muted)",
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
                              background: "var(--color-bg-muted)",
                              color: "var(--color-text-secondary)",
                              fontWeight: 600,
                            }}
                          >
                            {signal.source.name}
                          </Badge>
                          <Badge
                            size="xs"
                            variant="outline"
                            style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border-dark)", fontSize: 10 }}
                          >
                            {signal.source.type}
                          </Badge>
                        </Group>
                        <Text size="xs" c="var(--color-text-muted)">
                          {formatTimeAgo(signal.publishedAt)}
                        </Text>
                      </Group>
                      <Text fw={600} size="sm" c="var(--color-text-primary)" lineClamp={2} mb={4} style={{ lineHeight: 1.4 }}>
                        {displayTitle}
                      </Text>
                      <Group gap={12}>
                        {location && (
                          <Text size="xs" c="var(--color-text-muted)">{location.name}</Text>
                        )}
                        <Text size="xs" c="var(--color-text-muted)" style={{ marginLeft: "auto" }}>
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
                              color: "var(--color-accent)",
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
        {/* Label row - aligns with toolbar */}
        <Group mb={12} align="center" style={{ minHeight: 32 }}>
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>Crisis Map</Text>
        </Group>
        <Card p={0} style={{ border: "1px solid var(--color-border)", position: "sticky", top: 24 }}>
          <Box style={{ height: 524 }}>
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
