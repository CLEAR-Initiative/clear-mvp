"use client";

import { useTranslations } from "next-intl";
import { Badge, Group, Stack, Table, Text } from "@mantine/core";
import { severityColors } from "~/lib/constants/severity";
import type { CountRow } from "~/lib/brief/view";

/**
 * Signals, Events and Alerts over exactly the Brief's area and window, by
 * severity and type. clear-api computes them, whatever the list on the right
 * is filtered to; live while a draft, frozen once sent.
 */
export function BriefCounts({ rows }: { rows: CountRow[] }) {
  const t = useTranslations("brief");
  return (
    <Table withRowBorders verticalSpacing={6} data-testid="brief-counts">
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr key={row.kind} data-testid={`brief-count-${row.kind}`}>
            <Table.Td style={{ width: 90, verticalAlign: "top" }}>
              <Text size="sm" fw={600} c="var(--color-text-primary)">
                {row.label}
              </Text>
            </Table.Td>
            <Table.Td style={{ width: 48, verticalAlign: "top", textAlign: "end" }}>
              <Text size="sm" fw={700} c="var(--color-text-primary)" data-testid="brief-count-total">
                {row.total}
              </Text>
            </Table.Td>
            <Table.Td>
              {row.total === 0 ? (
                <Text size="xs" c="var(--color-text-muted)">
                  {t("counts.none")}
                </Text>
              ) : (
                <Stack gap={4}>
                  <Group gap={4} wrap="wrap">
                    {row.bySeverity.map((b) => {
                      const tone = severityColors[b.key] ?? severityColors.unknown!;
                      return (
                        <Badge key={b.key} size="sm" variant="light" style={{ background: tone.bg, color: tone.text, textTransform: "none" }}>
                          {b.label} {b.count}
                        </Badge>
                      );
                    })}
                  </Group>
                  {row.byType.length > 0 && (
                    <Text size="xs" c="var(--color-text-secondary)">
                      {row.kind === "signal" ? t("counts.bySource") : t("counts.byType")}:{" "}
                      {row.byType.map((b) => `${b.label} ${b.count}`).join(", ")}
                      {row.moreTypes > 0 ? `, ${t("counts.more", { count: row.moreTypes })}` : ""}
                    </Text>
                  )}
                </Stack>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
