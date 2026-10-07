"use client";

import { Badge, Box, Card, Group, Stack, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { ImpactPriorCard } from "~/components/impact-prior/impact-prior-card";
import { ImpactPriorPane } from "~/components/impact-prior/impact-prior-pane";
import { CaseProposalRow } from "~/components/impact-prior/case-proposal-row";
import { canReviewImpactPriors } from "~/lib/inbox-access";
import { groupBySourceKind, isCaseReviewedKind, isImpactPriorKind, sourceLabel } from "~/lib/impact-prior-source";
import type { GqlCaseProposalDecision, GqlImpactPrior, GqlTask } from "~/lib/types/graphql";

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
 *
 * V3: several Workers propose on one Event (one Task per source kind), so
 * the proposals are grouped by source — CLEAR data, the web, anything else
 * by its raw kind — each group newest first, and every Task row names its
 * source and, when known, the Worker that held it.
 *
 * V4: the web Worker's evidence is decided case by case. Its cases are
 * listed under their own heading, each with its own Accept / Reject for a
 * decider (the same row the Inbox mounts); its whole-prior proposals are
 * never decidable here — a still-proposed one is left out (its cases are
 * the decision), a decided one stays as read-only history.
 */
export function EnrichmentSection({ eventId }: { eventId: string }) {
  const enabled = useFeatureEnabled("event_enrichment");
  const review = useFeatureEnabled("impact_prior_review");
  const t = useTranslations("eventDetail.enrichment");
  const tReview = useTranslations("impactPriorReview");
  const tCases = useTranslations("caseReview");
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000, enabled });
  const canDecide = canReviewImpactPriors({ role: authData?.user?.role, impactPriorReview: review });

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
  // Web (and bare-kind) priors are history: their cases are the decision.
  const priors = (query.data?.impactPriors ?? []).filter(
    (prior) => !(isCaseReviewedKind(prior.sourceKind) && prior.state === "proposed"),
  );
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
        {query.isError ? (
          <Text size="xs" c="var(--color-critical)" data-testid="enrichment-load-error">
            {t("loadFailed")}
          </Text>
        ) : tasks.length === 0 && priors.length === 0 && cases.length === 0 ? (
          <Text size="xs" c="var(--color-text-muted)">
            {t("empty")}
          </Text>
        ) : (
          <Stack gap={12}>
            {groupBySourceKind(priors).map((group) => (
              <Stack key={group.kind} gap={8} data-testid="enrichment-group" data-source-kind={group.kind}>
                <Text size="xs" fw={600} c="var(--color-text-secondary)" data-testid="enrichment-group-title">
                  {t("group", { source: sourceLabel(group.kind, t), count: group.rows.length })}
                </Text>
                {group.rows.map((prior) =>
                  canDecide && prior.state === "proposed" && !isCaseReviewedKind(prior.sourceKind) ? (
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
              </Stack>
            ))}
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
  // One row per kind: "Impact prior · CLEAR data", "Impact prior · Web", or
  // the raw kind for anything outside the family.
  const kind = isImpactPriorKind(task.kind) ? `${t("kinds.impactPrior")} · ${sourceLabel(task.kind, t)}` : task.kind;
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
