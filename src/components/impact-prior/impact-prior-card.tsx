"use client";

import { Anchor, Badge, Box, Group, Stack, Text } from "@mantine/core";
import { useFormatter, useTranslations } from "next-intl";
import type { GqlImpactPrior } from "~/lib/types/graphql";
import { sourceLabel } from "~/lib/impact-prior-source";

/** A Worker-supplied URL is rendered as a link only when it is http(s);
 *  anything else (javascript:, data:, garbage) is shown as text. */
export function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const STATE_COLOR: Record<GqlImpactPrior["state"], string> = {
  proposed: "yellow",
  accepted: "green",
  rejected: "red",
};

/**
 * One ImpactPrior, read-only (clear-api ADR-0010): its source (which Worker
 * kind produced it — CLEAR data, the web, or the raw kind), state, cases,
 * scope, horizon, method, the Worker's name when known, and the basis as a
 * list of cited cases. The same card backs the Event page's Enrichment
 * section and the Inbox's Review item, so a decider sees the same evidence
 * through either door.
 */
export function ImpactPriorCard({ prior }: { prior: GqlImpactPrior }) {
  const t = useTranslations("eventDetail.enrichment");
  const format = useFormatter();
  const scope = prior.geographicScope === "district" || prior.geographicScope === "country"
    ? t(`scope.${prior.geographicScope}`)
    : prior.geographicScope;
  const source = sourceLabel(prior.sourceKind, t);
  const workerName = prior.task?.leaseOwner?.name ?? null;
  return (
    <Box
      data-testid="enrichment-prior"
      data-state={prior.state}
      data-source-kind={prior.sourceKind}
      p={10}
      style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "var(--color-bg-muted)" }}
    >
      <Group justify="space-between" gap={6} wrap="nowrap" mb={4}>
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <Text size="xs" fw={600} c="var(--color-text-primary)">
            {t("kinds.impactPrior")}
          </Text>
          <Badge size="xs" variant="outline" color="gray" data-testid="enrichment-prior-source" style={{ textTransform: "none" }}>
            {source}
          </Badge>
        </Group>
        <Badge size="xs" variant="light" color={STATE_COLOR[prior.state] ?? "gray"}>
          {t(`prior.${prior.state}`)}
        </Badge>
      </Group>
      <Text size="xs" c="var(--color-text-secondary)">
        {t("cases", { count: prior.numberOfCases })} · {scope} · {t("horizon", { years: prior.horizonYears })}
      </Text>
      <Text size="xs" c="var(--color-text-muted)">
        {t("method", { version: prior.methodVersion })}
        {workerName ? ` · ${t("worker", { name: workerName })}` : ""}
        {prior.supersedesId ? ` · ${t("supersedes")}` : ""}
        {" · "}
        {format.relativeTime(new Date(prior.createdAt))}
      </Text>
      {prior.state === "rejected" && prior.decisionRationale && (
        <Text size="xs" c="var(--color-critical)" mt={4}>
          {prior.decisionRationale}
        </Text>
      )}
      {Array.isArray(prior.basis) && prior.basis.length > 0 && (
        <Stack gap={6} mt={8}>
          {prior.basis.map((c, i) => (
            <Box key={i} data-testid="enrichment-case" pl={8} style={{ borderInlineStart: "2px solid var(--color-border)" }}>
              <Group gap={6} wrap="nowrap">
                <Badge size="xs" variant="outline" color="gray">
                  {c.tier === "clear" || c.tier === "web" ? t(`tier.${c.tier}`) : c.tier}
                </Badge>
                <Text size="xs" c="var(--color-text-muted)">
                  {[
                    c.occurredAt ? format.dateTime(new Date(c.occurredAt), "short") : null,
                    c.locationLabel ?? null,
                    c.scope === "district" || c.scope === "country" ? t(`scope.${c.scope}`) : c.scope,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Group>
              {c.quote && (
                <Text size="xs" c="var(--color-text-secondary)" lineClamp={3} style={{ fontStyle: "italic" }}>
                  “{c.quote}”
                </Text>
              )}
              {c.sourceUrl &&
                (safeHttpUrl(c.sourceUrl) ? (
                  <Anchor href={safeHttpUrl(c.sourceUrl)!} target="_blank" rel="noopener noreferrer" size="xs">
                    {t("source")}
                  </Anchor>
                ) : (
                  <Text size="xs" c="var(--color-text-muted)" data-testid="enrichment-unsafe-source">
                    {t("source")}: {c.sourceUrl}
                  </Text>
                ))}
              {c.eventId && (
                <Anchor href={`/event/${encodeURIComponent(c.eventId)}`} size="xs">
                  {t("priorEvent")}
                </Anchor>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
