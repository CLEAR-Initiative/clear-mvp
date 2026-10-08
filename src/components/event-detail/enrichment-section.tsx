"use client";

import { Badge, Box, Card, Group, Stack, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { CaseProposalRow } from "~/components/impact-prior/case-proposal-row";
import { ComputedPriors } from "~/components/impact-prior/computed-priors";
import { canReviewCaseProposals } from "~/lib/inbox-access";
import { requestLabel } from "~/lib/impact-prior-source";
import type { GqlCaseProposalDecision, GqlTask } from "~/lib/types/graphql";

const STATUS_COLOR: Record<GqlTask["status"], string> = {
  PENDING: "gray",
  LEASED: "blue",
  COMPLETED: "green",
  FAILED: "red",
  CANCELLED: "gray",
};

/**
 * The Event's enrichment (clear-api ADR-0010): the ImpactPriors computed
 * from CLEAR's accepted history (read-only), the web cases its requests
 * found, and each Task (kind and source, status, requester, Worker, when,
 * its error when FAILED and the server let us see it). Polls while a Task
 * is open so the result appears without a reload. Behind the
 * `event_enrichment` flag.
 *
 * V4: evidence is decided case by case. The cases ("proposed signals") are
 * listed under their own heading, each with its own Accept / Reject for a
 * decider (the same row the Inbox mounts). The prior itself is computed
 * from accepted history; nothing proposes a whole one.
 */
export function EnrichmentSection({ eventId }: { eventId: string }) {
  const enabled = useFeatureEnabled("event_enrichment");
  const review = useFeatureEnabled("impact_prior_review");
  const t = useTranslations("eventDetail.enrichment");
  const tCases = useTranslations("caseReview");
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000, enabled });
  const canDecide = canReviewCaseProposals({ role: authData?.user?.role, impactPriorReview: review });

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
  const cases = query.data?.caseProposals ?? [];

  return (
    <Card p={0} style={{ border: "1px solid var(--color-border)" }} data-testid="enrichment-section">
      <Box px={16} py={12} className="border-b border-[var(--color-border)]">
        <Group gap={6}>
          <IconSparkles size={14} color="var(--color-text-secondary)" />
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
            {t("title")}
          </Text>
        </Group>
      </Box>
      <Box p={16}>
        {/* What history says, computed on read (V4): independent of any request. */}
        <ComputedPriors eventId={eventId} enabled={enabled} />
        {query.isError ? (
          <Text size="xs" c="var(--color-critical)" data-testid="enrichment-load-error">
            {t("loadFailed")}
          </Text>
        ) : tasks.length === 0 && cases.length === 0 ? (
          <Text size="xs" c="var(--color-text-muted)">
            {t("empty")}
          </Text>
        ) : (
          <Stack gap={12}>
            {cases.length > 0 && (
              <Stack gap={8} data-testid="enrichment-cases">
                <Text size="xs" fw={600} c="var(--color-text-secondary)" data-testid="enrichment-cases-title">
                  {tCases("group", { count: cases.length })}
                </Text>
                {cases.map((proposal) => (
                  <CaseProposalRow
                    key={proposal.id}
                    proposal={proposal}
                    canDecide={canDecide}
                    onDecided={(_decided, decision: GqlCaseProposalDecision) =>
                      notifications.show({ message: tCases(`toast.${decision}`) })
                    }
                  />
                ))}
              </Stack>
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

/** One Task's status line — kind and source, status, requester, Worker,
 * outcome, and its error when the server let us see it. Shared with the
 * Inbox's "My requests" pane. */
export function TaskRow({ task }: { task: GqlTask }) {
  const t = useTranslations("eventDetail.enrichment");
  const format = useFormatter();
  const kind = requestLabel(task.kind, t);
  return (
    <Box data-testid="enrichment-task" data-status={task.status} data-kind={task.kind}>
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
        {task.leaseOwner?.name ? t("worker", { name: task.leaseOwner.name }) + " · " : ""}
        {format.relativeTime(new Date(task.createdAt))}
      </Text>
      {task.status === "COMPLETED" && task.outcome && (
        <Text size="xs" c="var(--color-text-secondary)">
          {task.outcome === "produced" || task.outcome === "no_prior_found" || task.outcome === "no_new_cases"
            ? t(`outcome.${task.outcome}`)
            : task.outcome}
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
