"use client";

import { Badge, Box, Card, Group, Stack, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { ImpactPriorCard } from "~/components/impact-prior/impact-prior-card";
import { ImpactPriorPane } from "~/components/impact-prior/impact-prior-pane";
import { canDecideImpactPriors } from "~/lib/roles";
import type { GqlImpactPrior, GqlTask } from "~/lib/types/graphql";

const STATUS_COLOR: Record<GqlTask["status"], string> = {
  PENDING: "gray",
  LEASED: "blue",
  COMPLETED: "green",
  FAILED: "red",
  CANCELLED: "gray",
};

/**
 * The Event's enrichment (clear-api ADR-0010): each Task (kind, status,
 * requester, when, its error when FAILED and the server let us see it) and
 * each ImpactPrior the server returned for this user (state, cases, scope,
 * horizon, and the basis as a list of cited cases). Which states a user
 * sees is clear-api's rule; proposed and rejected rows render only when
 * they arrive. Polls while a Task is open so the result appears without a
 * reload. Behind the `event_enrichment` flag.
 *
 * V2: a proposed ImpactPrior is shown to a decider (admin or analyst, with
 * `impact_prior_review` on) through the same ImpactPriorPane the Inbox
 * uses — the Event page is the second door to the same decision.
 */
export function EnrichmentSection({ eventId }: { eventId: string }) {
  const enabled = useFeatureEnabled("event_enrichment");
  const review = useFeatureEnabled("impact_prior_review");
  const t = useTranslations("eventDetail.enrichment");
  const tReview = useTranslations("impactPriorReview");
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000, enabled });
  const canDecide = review && canDecideImpactPriors(authData?.user?.role);

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
            {priors.map((prior) =>
              canDecide && prior.state === "proposed" ? (
                <ImpactPriorPane
                  key={prior.id}
                  prior={prior}
                  canDecide
                  onDecided={(_decided: GqlImpactPrior, decision) =>
                    notifications.show({ message: tReview(`toast.${decision}`) })
                  }
                />
              ) : (
                <ImpactPriorCard key={prior.id} prior={prior} />
              ),
            )}
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
