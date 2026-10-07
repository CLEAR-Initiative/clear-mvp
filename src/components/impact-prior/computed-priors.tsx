"use client";

import { Anchor, Badge, Box, Group, Stack, Text } from "@mantine/core";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { isCaseMetric } from "~/lib/case-proposals";
import type { GqlComputedImpactPrior } from "~/lib/types/graphql";

/** Past Events linked per prior before the rest are summarised as "+N more". */
export const PAST_EVENT_LINKS_MAX = 10;

/**
 * The Event's ImpactPriors computed from CLEAR's accepted history (clear-api
 * V4, `Event.computedImpactPriors`): what has typically happened before for
 * this hazard in this country. Read-only — computed on read, nothing to
 * decide. One row per prior: the central figure with its range and unit
 * (people when none), the case count right beside it, the metric and
 * population group, a muted marker when it rests on too few Events, and
 * links to those Events. Renders nothing while loading, on error, or when
 * there is no history; the rest of the Enrichment section stands on its own.
 */
export function ComputedPriors({ eventId, enabled }: { eventId: string; enabled: boolean }) {
  const t = useTranslations("computedPrior");
  const query = api.tasks.computedPriors.useQuery({ eventId }, { enabled, staleTime: 60_000 });
  const priors = query.data ?? [];
  if (!enabled || priors.length === 0) return null;
  return (
    <Stack gap={8} mb={12} data-testid="computed-priors">
      <Text size="xs" fw={600} c="var(--color-text-secondary)" data-testid="computed-priors-title">
        {t("title")}
      </Text>
      {priors.map((prior, i) => (
        <ComputedPriorRow key={`${prior.hazardType}:${prior.metric}:${prior.populationGroup ?? ""}:${prior.unit ?? ""}:${i}`} prior={prior} />
      ))}
    </Stack>
  );
}

export function ComputedPriorRow({ prior }: { prior: GqlComputedImpactPrior }) {
  const t = useTranslations("computedPrior");
  const tCases = useTranslations("caseReview");
  const tEnrichment = useTranslations("eventDetail.enrichment");
  const format = useFormatter();
  const num = (n: number) => format.number(n, { maximumFractionDigits: 0 });
  const metric = isCaseMetric(prior.metric) ? tCases(`metric.${prior.metric}`) : prior.metric;
  const figure = prior.unit
    ? t("figureUnit", { value: num(prior.centralValue), unit: prior.unit })
    : t("figurePeople", { value: num(prior.centralValue) });
  const ranged = prior.lowerBound !== prior.upperBound;
  const shown = prior.eventIds.slice(0, PAST_EVENT_LINKS_MAX);
  const more = prior.eventIds.length - shown.length;
  return (
    <Box
      data-testid="computed-prior"
      data-low-confidence={prior.lowConfidence}
      p={10}
      style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "var(--color-bg-muted)" }}
    >
      <Group justify="space-between" gap={6} wrap="nowrap" mb={2}>
        <Text size="xs" fw={600} c="var(--color-text-primary)" truncate>
          {prior.populationGroup ? `${metric} · ${prior.populationGroup}` : metric}
        </Text>
        {prior.lowConfidence && (
          <Badge size="xs" variant="outline" color="gray" style={{ textTransform: "none" }} data-testid="computed-prior-low-confidence">
            {t("lowConfidence")}
          </Badge>
        )}
      </Group>
      <Text size="sm" c="var(--color-text-primary)" data-testid="computed-prior-figure">
        <Text span fw={700}>
          {figure}
        </Text>
        {ranged && (
          <Text span size="xs" c="var(--color-text-secondary)">
            {" "}
            {t("range", { low: num(prior.lowerBound), high: num(prior.upperBound) })}
          </Text>
        )}
        <Text span size="xs" c="var(--color-text-secondary)" data-testid="computed-prior-cases">
          {" · "}
          {t("fromEvents", { count: prior.numberOfCases })}
        </Text>
      </Text>
      <Text size="xs" c="var(--color-text-muted)">
        {prior.hazardType} · {tEnrichment("horizon", { years: prior.horizonYears })} · {tEnrichment("method", { version: prior.methodVersion })}
      </Text>
      {shown.length > 0 && (
        <Group gap={8} mt={4} wrap="wrap" data-testid="computed-prior-events">
          {shown.map((id, i) => (
            <Anchor key={id} href={`/event/${encodeURIComponent(id)}`} size="xs" data-testid="computed-prior-event">
              {t("pastEvent", { n: i + 1 })}
            </Anchor>
          ))}
          {more > 0 && (
            <Text size="xs" c="var(--color-text-muted)">
              {t("moreEvents", { count: more })}
            </Text>
          )}
        </Group>
      )}
    </Box>
  );
}
