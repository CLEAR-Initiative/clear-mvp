"use client";

import {
  Box,
  Text,
  Group,
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
} from "@tabler/icons-react";
import { severityColor } from "~/lib/types/graphql";
import type { SeverityKey, SortOrder } from "./use-list-filters";
import { SORT_LABELS } from "./use-list-filters";

interface ListFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  activeSeverities: Set<SeverityKey>;
  onToggleSeverity: (sev: SeverityKey) => void;
  activeTypes: Set<string> | null;
  allTypes: string[];
  onToggleType: (type: string) => void;
  sortOrder: SortOrder;
  onSortChange: (order: SortOrder) => void;
  isFiltered: boolean;
  onClearFilters: () => void;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode; // slot for extra controls (e.g. segmented control)
}

export function ListFilterBar({
  search,
  onSearchChange,
  activeSeverities,
  onToggleSeverity,
  activeTypes,
  allTypes,
  onToggleType,
  sortOrder,
  onSortChange,
  isFiltered,
  onClearFilters,
  filterOpen,
  onFilterOpenChange,
  searchPlaceholder = "Search...",
  children,
}: ListFilterBarProps) {
  return (
    <Group gap={8} mb={16}>
      {children}

      <TextInput
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        leftSection={<IconSearch size={14} color="#A3A3A3" />}
        rightSection={
          search ? (
            <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => onSearchChange("")}>
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
        onChange={onFilterOpenChange}
        position="bottom-end"
        shadow="md"
        width={240}
      >
        <Popover.Target>
          <button
            onClick={() => onFilterOpenChange(!filterOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 6,
              border: `1px solid ${isFiltered ? "#E85D3D" : "#E5E5E5"}`,
              background: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              color: isFiltered ? "#E85D3D" : "#525252",
              position: "relative",
            }}
          >
            <IconFilter size={13} />
            Filter
            {isFiltered && (
              <Box
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#E85D3D",
                }}
              />
            )}
          </button>
        </Popover.Target>
        <Popover.Dropdown p={16}>
          <Text size="xs" fw={700} c="#171717" mb={10}>Severity</Text>
          <Group gap={6} mb={14}>
            {(["critical", "high", "medium", "low"] as SeverityKey[]).map((sev) => {
              const active = activeSeverities.has(sev);
              const color = severityColor(sev === "critical" ? 5 : sev === "high" ? 4 : sev === "medium" ? 3 : 2);
              return (
                <button
                  key={sev}
                  onClick={() => onToggleSeverity(sev)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: `1px solid ${active ? color : "#E5E5E5"}`,
                    background: active ? `${color}15` : "#F9FAFB",
                    color: active ? color : "#737373",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {sev}
                </button>
              );
            })}
          </Group>

          {allTypes.length > 0 && (
            <>
              <Divider color="#F0F0F0" mb={10} />
              <Text size="xs" fw={700} c="#171717" mb={8}>Event Type</Text>
              <Stack gap={4}>
                {allTypes.map((type) => {
                  const active = activeTypes === null || activeTypes.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => onToggleType(type)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: "1px solid",
                        borderColor: active ? "#E85D3D30" : "#E5E5E5",
                        background: active ? "#FEF2F0" : "#F9FAFB",
                        color: active ? "#E85D3D" : "#737373",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {type}
                      {active && (
                        <Box style={{ width: 6, height: 6, borderRadius: "50%", background: "#E85D3D" }} />
                      )}
                    </button>
                  );
                })}
              </Stack>
            </>
          )}

          {isFiltered && (
            <>
              <Divider color="#F0F0F0" my={10} />
              <button
                onClick={onClearFilters}
                style={{
                  width: "100%",
                  padding: "6px",
                  borderRadius: 6,
                  border: "1px solid #E5E5E5",
                  background: "#F9FAFB",
                  color: "#525252",
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
              gap: 6,
              padding: "5px 10px",
              borderRadius: 6,
              border: `1px solid ${sortOrder !== "sev-desc" ? "#E85D3D" : "#E5E5E5"}`,
              background: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              color: sortOrder !== "sev-desc" ? "#E85D3D" : "#525252",
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
              onClick={() => onSortChange(key)}
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
  );
}
