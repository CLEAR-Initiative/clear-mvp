"use client";

import { Anchor, Badge, Box, Card, Group, Stack, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import type { GqlImpactPrior, GqlTask } from "~/lib/types/graphql";

const STATUS_COLOR: Record<GqlTask["status"], string> = {
  PENDING: "gray",
  LEASED: "blue",
  COMPLETED: "green",
  FAILED: "red",
  CANCELLED: "gray",
};

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
 * The Event's enrichment, read-only (clear-api ADR-0010, V1): each Task
 * (kind, status, requester, when, its error when FAILED and the server let
 * us see it) and each ImpactPrior the server returned for this user (state,
 * cases, scope, horizon, and the basis as a list of cited cases). Which
 * states a user sees is clear-api's rule; proposed and rejected rows render
 * only when they arrive. Polls while a Task is open so the result appears
 * without a reload. Behind the `event_enrichment` flag.
 */
export function EnrichmentSection({ eventId }: { eventId: string }) {
  const enabled = useFeatureEnabled("event_enrichment");
  const t = useTranslations("eventDetail.enrichment");
  const format = useFormatter();

  const query = api.tasks.forEvent.useQuery(
    { eventId },
    {
      enabled,
      staleTime: 15_000,
      refetchInterval: (q) =>
        q.state.data?.tasks.some((task) => task.status === "PENDING" || task.status === "LEASED") ? 30_000 : false,
    },
  );

  if (!enabled) return null;
  const tasks = query.data?.tasks ?? [];
  const priors = query.data?.impactPriors ?? [];

  return (
    <Card p={0} style={{ border: "1px solid var(--color-border)" }} data-testid="enrichment-section">
      <Box px={16} py={10} className="border-b border-[var(--color-border)]">
        <Group gap={6}>
          <IconSparkles size={14} color="var(--color-text-secondary)" />
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>
            {t("title")}
          </Text>
        </Group>
      </Box>
      <Box p={16}>
        {query.isError ? (
          <Text size="xs" c="var(--color-critical)" data-testid="enrichment-load-error">
            {t("loadFailed")}
          </Text>
        ) : tasks.length === 0 && priors.length === 0 ? (
          <Text size="xs" c="var(--color-text-muted)">
            {t("empty")}
          </Text>
        ) : (
          <Stack gap={12}>
            {priors.map((prior) => (
              <ImpactPriorRow key={prior.id} prior={prior} />
            ))}
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </Stack>
        )}
      </Box>
    </Card>
  );
}

function TaskRow({ task }: { task: GqlTask }) {
  const t = useTranslations("eventDetail.enrichment");
  const format = useFormatter();
  const kind = task.kind === "event.impact_prior" ? t("kinds.impactPrior") : task.kind;
  return (
    <Box data-testid="enrichment-task" data-status={task.status}>
      <Group justify="space-between" gap={6} wrap="nowrap">
        <Text size="xs" fw={600} c="var(--color-text-primary)" style={{ minWidth: 0 }} truncate>
          {kind}
        </Text>
        <Badge size="xs" variant="light" color={STATUS_COLOR[task.status] ?? "gray"}>
          {t(`status.${task.status}`)}
        </Badge>
      </Group>
      <Text size="xs" c="var(--color-text-muted)">
        {task.requester?.name ? t("requestedBy", { name: task.requester.name }) + " · " : ""}
        {format.relativeTime(new Date(task.createdAt))}
      </Text>
      {task.status === "COMPLETED" && task.outcome && (
        <Text size="xs" c="var(--color-text-secondary)">
          {task.outcome === "produced" || task.outcome === "no_prior_found" ? t(`outcome.${task.outcome}`) : task.outcome}
        </Text>
      )}
      {task.status === "FAILED" && task.lastError && (
        <Text size="xs" c="var(--color-critical)" data-testid="enrichment-task-error">
          {t("errorLabel")}: {task.lastError}
        </Text>
      )}
    </Box>
  );
}

function ImpactPriorRow({ prior }: { prior: GqlImpactPrior }) {
  const t = useTranslations("eventDetail.enrichment");
  const format = useFormatter();
  const scope = prior.geographicScope === "district" || prior.geographicScope === "country"
    ? t(`scope.${prior.geographicScope}`)
    : prior.geographicScope;
  return (
    <Box
      data-testid="enrichment-prior"
      data-state={prior.state}
      p={10}
      style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "var(--color-bg-muted)" }}
    >
      <Group justify="space-between" gap={6} wrap="nowrap" mb={4}>
        <Text size="xs" fw={600} c="var(--color-text-primary)">
          {t("kinds.impactPrior")}
        </Text>
        <Badge size="xs" variant="light" color={STATE_COLOR[prior.state] ?? "gray"}>
          {t(`prior.${prior.state}`)}
        </Badge>
      </Group>
      <Text size="xs" c="var(--color-text-secondary)">
        {t("cases", { count: prior.numberOfCases })} · {scope} · {t("horizon", { years: prior.horizonYears })}
      </Text>
      <Text size="xs" c="var(--color-text-muted)">
        {t("method", { version: prior.methodVersion })}
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
