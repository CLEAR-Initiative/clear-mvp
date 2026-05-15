"use client";

import { useState } from "react";
import {
  Box, Text, Stack, Group, Checkbox, Popover, ScrollArea, UnstyledButton, Collapse, Input,
} from "@mantine/core";
import { IconChevronRight, IconChevronDown, IconSelector } from "@tabler/icons-react";

export interface HierarchyLevel1 {
  name: string;
  groups: Array<{ name: string; codes: string[] }>;
}

interface DisasterTypePickerProps {
  label?: string;
  hierarchy: HierarchyLevel1[];
  selected: string[];
  onChange: (types: string[]) => void;
  size?: "xs" | "sm";
}

/** Expand selected "<l1>::<l2>" keys to their underlying glide codes */
export function expandSelectionsToCodes(
  selections: string[],
  hierarchy: HierarchyLevel1[],
): string[] {
  const codes = new Set<string>();
  for (const value of selections) {
    const [l1Name, l2Name] = value.split("::");
    const l1 = hierarchy.find((h) => h.name === l1Name);
    const l2 = l1?.groups.find((g) => g.name === l2Name);
    l2?.codes.forEach((c) => codes.add(c));
  }
  return [...codes];
}

export function DisasterTypePicker({
  label,
  hierarchy,
  selected,
  onChange,
  size = "xs",
}: DisasterTypePickerProps) {
  const [opened, setOpened] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const l2KeysForL1 = (l1Name: string) =>
    hierarchy.find((h) => h.name === l1Name)?.groups.map((g) => `${l1Name}::${g.name}`) ?? [];

  const getL1State = (l1Name: string): "all" | "some" | "none" => {
    const children = l2KeysForL1(l1Name);
    if (!children.length) return "none";
    const n = children.filter((k) => selected.includes(k)).length;
    if (n === 0) return "none";
    return n === children.length ? "all" : "some";
  };

  const isL2Selected = (l1Name: string, l2Name: string) =>
    selected.includes(`${l1Name}::${l2Name}`);

  const toggleL1 = (l1Name: string) => {
    const children = l2KeysForL1(l1Name);
    const state = getL1State(l1Name);
    if (state === "all") {
      onChange(selected.filter((k) => !children.includes(k)));
    } else {
      onChange([...new Set([...selected, ...children])]);
    }
  };

  const toggleL2 = (l1Name: string, l2Name: string) => {
    const key = `${l1Name}::${l2Name}`;
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };

  const toggleExpand = (l1Name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(l1Name) ? next.delete(l1Name) : next.add(l1Name);
      return next;
    });

  const summary = selected.length === 0
    ? "Select disaster types"
    : `${selected.length} type${selected.length === 1 ? "" : "s"} selected`;

  const height = size === "xs" ? 30 : 36;
  const fontSize = size === "xs" ? 13 : 14;
  const fontWeight = 600;

  return (
    <Input.Wrapper label={label && (
      <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.05em" }}>
        {label}
      </Text>
    )}>

      <Popover
        opened={opened}
        onChange={setOpened}
        width="target"
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
              width: "100%",
              height,
              paddingLeft: 10,
              paddingRight: 8,
              border: "1px solid var(--color-border-dark)",
              borderRadius: 0,
              fontSize,
              fontWeight,
              background: "var(--color-bg-muted)",
              boxShadow: "var(--shadow-sm)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {summary}
            </span>
            <IconSelector size={14} style={{ flexShrink: 0, marginLeft: 4, color: "var(--color-text-muted)" }} />
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown p={0} onMouseDown={(e) => e.stopPropagation()}>
          <ScrollArea.Autosize mah={300} type="auto">
            <Stack gap={0} p={4}>
              {hierarchy.length === 0 && (
                <Text size="xs" c="var(--color-text-muted)" px={8} py={8} style={{ fontSize: 11 }}>
                  Loading types...
                </Text>
              )}
              {hierarchy.map((l1) => {
                const state = getL1State(l1.name);
                const isExpanded = expanded.has(l1.name);
                return (
                  <Box key={l1.name}>
                    <Group gap={4} wrap="nowrap" px={6} py={5} style={{ borderRadius: 0 }}>
                      <UnstyledButton
                        onClick={() => toggleExpand(l1.name)}
                        style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
                      >
                        {isExpanded
                          ? <IconChevronDown size={13} color="var(--color-text-muted)" />
                          : <IconChevronRight size={13} color="var(--color-text-muted)" />}
                      </UnstyledButton>
                      <Checkbox
                        size="xs"
                        checked={state === "all"}
                        indeterminate={state === "some"}
                        onChange={() => toggleL1(l1.name)}
                        label={
                          <Text size="xs" fw={600} tt="capitalize" style={{ fontSize: 11 }}>
                            {l1.name}
                          </Text>
                        }
                        styles={{ label: { paddingLeft: 4 } }}
                      />
                    </Group>
                    <Collapse in={isExpanded}>
                      <Stack gap={0} pl={30} pb={2}>
                        {l1.groups.map((l2) => (
                          <Checkbox
                            key={l2.name}
                            size="xs"
                            checked={isL2Selected(l1.name, l2.name)}
                            onChange={() => toggleL2(l1.name, l2.name)}
                            label={
                              <Text size="xs" tt="capitalize" style={{ fontSize: 11 }}>
                                {l2.name}
                              </Text>
                            }
                            styles={{ label: { paddingLeft: 4 }, body: { padding: "3px 4px" } }}
                          />
                        ))}
                      </Stack>
                    </Collapse>
                  </Box>
                );
              })}
            </Stack>
          </ScrollArea.Autosize>
        </Popover.Dropdown>
      </Popover>
    </Input.Wrapper>
  );
}
