"use client";

import { useState, useMemo } from "react";
import {
  Box, Text, Stack, Popover, ScrollArea, UnstyledButton, Collapse, Input, TextInput,
} from "@mantine/core";
import { IconChevronRight, IconChevronDown, IconSelector, IconSearch, IconX } from "@tabler/icons-react";

interface District {
  id: string;
  name: string;
}

interface StateNode {
  id: string;
  name: string;
  districts: District[];
}

interface RegionPickerProps {
  states: StateNode[];
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
}

function getDisplayName(value: string | null, states: StateNode[]): string {
  if (!value) return "All Regions";
  for (const state of states) {
    if (state.id === value) return state.name;
    for (const district of state.districts) {
      if (district.id === value) return `${district.name}, ${state.name}`;
    }
  }
  return "All Regions";
}

export function RegionPicker({ states, value, onChange, label }: RegionPickerProps) {
  const [opened, setOpened] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filteredStates = useMemo(() => {
    if (!q) return states;
    return states.flatMap((state) => {
      const stateMatches = state.name.toLowerCase().includes(q);
      const matchingDistricts = state.districts.filter((d) => d.name.toLowerCase().includes(q));
      if (!stateMatches && matchingDistricts.length === 0) return [];
      return [{ ...state, districts: stateMatches ? state.districts : matchingDistricts }];
    });
  }, [states, q]);

  // Auto-expand states that have matching districts when a search is active
  const effectiveExpanded = useMemo(() => {
    if (!q) return expanded;
    const next = new Set(expanded);
    filteredStates.forEach((state) => {
      if (state.districts.some((d) => d.name.toLowerCase().includes(q))) {
        next.add(state.id);
      }
    });
    return next;
  }, [q, filteredStates, expanded]);

  const toggleExpand = (stateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(stateId) ? next.delete(stateId) : next.add(stateId);
      return next;
    });
  };

  const select = (id: string | null) => {
    onChange(id);
    setOpened(false);
    setQuery("");
  };

  const summary = getDisplayName(value, states);

  return (
    <Input.Wrapper
      label={label && (
        <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.05em" }}>
          {label}
        </Text>
      )}
    >
      <Popover
        opened={opened}
        onChange={setOpened}
        width={240}
        position="bottom-start"
        shadow="md"
        withinPortal
      >
        <Popover.Target>
          <UnstyledButton
            onClick={() => setOpened((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minWidth: 130,
              height: 30,
              paddingLeft: 10,
              paddingRight: 8,
              border: "1px solid var(--color-border-dark)",
              borderRadius: 0,
              fontSize: 13,
              fontWeight: 600,
              background: "var(--color-bg-muted)",
              boxShadow: "var(--shadow-sm)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 4 }}>
              {summary}
            </span>
            <IconSelector size={14} style={{ flexShrink: 0, color: "var(--color-text-muted)" }} />
          </UnstyledButton>
        </Popover.Target>

        <Popover.Dropdown p={0} onMouseDown={(e) => e.stopPropagation()}>
          <Box p={6} style={{ borderBottom: "1px solid var(--color-border)" }}>
            <TextInput
              placeholder="Search regions..."
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={12} color="var(--color-text-muted)" />}
              rightSection={
                query ? (
                  <UnstyledButton onClick={() => setQuery("")} style={{ display: "flex", alignItems: "center" }}>
                    <IconX size={12} color="var(--color-text-muted)" />
                  </UnstyledButton>
                ) : null
              }
              size="xs"
              styles={{ input: { fontSize: 12, border: "none", background: "transparent", paddingLeft: 28 } }}
            />
          </Box>

          <ScrollArea.Autosize mah={280} type="auto">
            <Stack gap={0} p={4}>
              {!q && (
                <UnstyledButton
                  onClick={() => select(null)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: !value ? 600 : 400,
                    color: !value ? "var(--color-accent)" : "var(--color-text-primary)",
                    background: !value ? "var(--color-accent-light)" : "transparent",
                    textAlign: "left",
                  }}
                >
                  All Regions
                </UnstyledButton>
              )}

              {filteredStates.map((state) => {
                const isSelected = value === state.id;
                const isExpanded = effectiveExpanded.has(state.id);
                return (
                  <Box key={state.id}>
                    <Box style={{ display: "flex", alignItems: "center" }}>
                      <UnstyledButton
                        onClick={(e) => toggleExpand(state.id, e)}
                        style={{ width: 22, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      >
                        {state.districts.length > 0
                          ? isExpanded
                            ? <IconChevronDown size={12} color="var(--color-text-muted)" />
                            : <IconChevronRight size={12} color="var(--color-text-muted)" />
                          : <Box style={{ width: 12 }} />}
                      </UnstyledButton>
                      <UnstyledButton
                        onClick={() => select(state.id)}
                        style={{
                          flex: 1,
                          padding: "4px 6px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? "var(--color-accent)" : "var(--color-text-primary)",
                          background: isSelected ? "var(--color-accent-light)" : "transparent",
                          textAlign: "left",
                        }}
                      >
                        {state.name}
                      </UnstyledButton>
                    </Box>

                    <Collapse in={isExpanded}>
                      <Stack gap={0} pl={22} pb={2}>
                        {state.districts.map((district) => {
                          const isDistrictSelected = value === district.id;
                          return (
                            <UnstyledButton
                              key={district.id}
                              onClick={() => select(district.id)}
                              style={{
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: isDistrictSelected ? 600 : 400,
                                color: isDistrictSelected ? "var(--color-accent)" : "var(--color-text-secondary)",
                                background: isDistrictSelected ? "var(--color-accent-light)" : "transparent",
                                textAlign: "left",
                              }}
                            >
                              {district.name}
                            </UnstyledButton>
                          );
                        })}
                      </Stack>
                    </Collapse>
                  </Box>
                );
              })}

              {filteredStates.length === 0 && q && (
                <Text size="xs" c="var(--color-text-muted)" px={8} py={6} style={{ fontSize: 11 }}>
                  No regions match &ldquo;{query}&rdquo;
                </Text>
              )}
            </Stack>
          </ScrollArea.Autosize>
        </Popover.Dropdown>
      </Popover>
    </Input.Wrapper>
  );
}
