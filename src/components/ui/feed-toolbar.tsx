"use client";

import { Group, Text, Badge, Loader, TextInput, Menu, ActionIcon } from "@mantine/core";
import { useTranslations } from "next-intl";
import { IconSearch, IconSortDescending, IconX, IconRefresh } from "@tabler/icons-react";

interface FeedToolbarProps {
  title: string;
  count: string;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  sortOrder: string;
  sortLabels: Record<string, string>;
  defaultSortKey?: string;
  onSortChange: (order: string) => void;
  newCount?: number;
  onRefresh?: () => void;
  /**
   * Optional slot rendered after the sort menu, in the same toolbar row.
   * Use for per-tab actions (e.g. a Filter popover) that should sit beside
   * the sort control rather than stacking on a separate row.
   */
  rightSlot?: React.ReactNode;
}

export function FeedToolbar({
  title,
  count,
  loading,
  search,
  onSearchChange,
  sortOrder,
  sortLabels,
  defaultSortKey = "newest",
  onSortChange,
  newCount = 0,
  onRefresh,
  rightSlot,
}: FeedToolbarProps) {
  const t = useTranslations("common.toolbar");
  const isNonDefault = sortOrder !== defaultSortKey;

  return (
    <>
      {newCount > 0 && onRefresh && (
        <Group
          gap={8} mb={8} px={12} py={6}
          style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent)", borderRadius: 6, cursor: "pointer" }}
          onClick={onRefresh}
        >
          <IconRefresh size={13} color="var(--color-accent)" />
          <Text size="xs" fw={600} c="var(--color-accent)">
            {t("newItems", { count: newCount })}
          </Text>
        </Group>
      )}

      <Group gap={8} mb={12} align="center" wrap="wrap" style={{ minHeight: 32 }}>
        <Group gap={6} style={{ flexShrink: 0 }}>
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>{title}</Text>
          <Badge size="xs" style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)", fontWeight: 600 }}>
            {loading ? "..." : count}
          </Badge>
          {loading && <Loader size="xs" />}
        </Group>

        <TextInput
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          leftSection={<IconSearch size={14} color="var(--color-text-muted)" />}
          rightSection={
            search ? (
              <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => onSearchChange("")}>
                <IconX size={12} />
              </ActionIcon>
            ) : null
          }
          size="xs"
          style={{ flex: "1 1 140px", minWidth: 0 }}
          styles={{ input: { fontSize: 13 } }}
        />

        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <button
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 30, borderRadius: 6,
                border: `1px solid ${isNonDefault ? "var(--color-accent)" : "var(--color-border)"}`,
                background: "var(--color-bg-white)", cursor: "pointer",
                color: isNonDefault ? "var(--color-accent)" : "var(--color-text-secondary)",
                flexShrink: 0,
              }}
            >
              <IconSortDescending size={13} />
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            {Object.entries(sortLabels).map(([key, label]) => (
              <Menu.Item
                key={key}
                onClick={() => onSortChange(key)}
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

        {rightSlot}
      </Group>
    </>
  );
}
