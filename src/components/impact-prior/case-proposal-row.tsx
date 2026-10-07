"use client";

import { useState } from "react";
import { Anchor, Badge, Box, Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { MAX_RATIONALE_LENGTH } from "~/lib/impact-prior-review";
import { caseFigures, figureText, isCaseMetric } from "~/lib/case-proposals";
import type { GqlCaseProposal, GqlCaseProposalDecision } from "~/lib/types/graphql";
import { safeHttpUrl } from "./impact-prior-card";

const STATE_COLOR: Record<GqlCaseProposal["state"], string> = {
  proposed: "yellow",
  accepted: "green",
  rejected: "red",
};

export interface CaseProposalRowProps {
  proposal: GqlCaseProposal;
  /** Client twin of clear-api's decider gate (admins and analysts, with
   * `impact_prior_review` on); the server is the real gate. Without it the
   * row is read-only. */
  canDecide: boolean;
  /** The decision was recorded; the caller toasts and keeps its copy. */
  onDecided?: (decided: GqlCaseProposal, decision: GqlCaseProposalDecision) => void;
  /** clear-api answered CONFLICT or NOT_FOUND: another decider got there
   * first (or the case is gone), so the caller's copy is stale. */
  onStale?: (proposal: GqlCaseProposal) => void;
}

/**
 * One web case (clear-api V4, CaseProposal) with its own Accept / Reject:
 * when and where it happened, the source's words and link, the figures it
 * gives, and the CLEAR Event it matches. Reject asks for a rationale
 * (required); Accept is one click. The row turns to its decided state in
 * place, and once accepted links to the Event the case now sits on.
 * Mounted through both doors — the Inbox's case group and the Event page's
 * Enrichment section — so the decision is the same wherever it is taken.
 * Styled as the impact-prior card it replaces for the web.
 */
export function CaseProposalRow({ proposal, canDecide, onDecided, onStale }: CaseProposalRowProps) {
  const t = useTranslations("caseReview");
  const tEnrichment = useTranslations("eventDetail.enrichment");
  const format = useFormatter();
  const utils = api.useUtils();
  const [rejecting, setRejecting] = useState(false);
  const [rationale, setRationale] = useState("");
  const [touched, setTouched] = useState(false);

  // Invalidate at the hook level: React Query drops per-call callbacks once
  // the row has unmounted (the Inbox pane unmounts on any selection change),
  // whereas these always run.
  const refetchDoors = () => {
    void utils.tasks.proposedCaseProposals.invalidate();
    void utils.tasks.reviewCount.invalidate();
    void utils.tasks.forEvent.invalidate({ eventId: proposal.eventId });
    // An accepted case's figures become history, which the computed priors
    // are read from.
    void utils.tasks.computedPriors.invalidate();
  };
  const decide = api.tasks.decideCaseProposal.useMutation({
    onSuccess: refetchDoors,
    onError: (err) => {
      if (err.data?.code === "CONFLICT" || err.data?.code === "NOT_FOUND") refetchDoors();
    },
  });

  // The decision's answer is the row's state from the moment it lands, even
  // before the refetch does: the row updates in place.
  const shown: GqlCaseProposal = decide.data && decide.data.id === proposal.id ? { ...proposal, ...decide.data } : proposal;
  const stale = decide.error?.data?.code === "CONFLICT" || decide.error?.data?.code === "NOT_FOUND";
  const decidable = canDecide && shown.state === "proposed";

  const trimmed = rationale.trim();
  const missing = trimmed.length === 0;
  const tooLong = trimmed.length > MAX_RATIONALE_LENGTH;

  const submit = (decision: GqlCaseProposalDecision) => {
    if (decide.isPending || stale) return;
    if (decision === "rejected") {
      setTouched(true);
      if (missing || tooLong) return;
    }
    decide.mutate(
      { id: proposal.id, decision, rationale: decision === "rejected" ? trimmed : undefined },
      {
        onSuccess: (decided) => {
          setRejecting(false);
          onDecided?.(decided, decision);
        },
        onError: (err) => {
          if (err.data?.code === "CONFLICT" || err.data?.code === "NOT_FOUND") onStale?.(proposal);
        },
      },
    );
  };

  const scope =
    shown.geographicScope === "district" || shown.geographicScope === "country"
      ? tEnrichment(`scope.${shown.geographicScope}`)
      : shown.geographicScope;
  const source = safeHttpUrl(shown.sourceUrl);
  const figures = caseFigures(shown);

  return (
    <Box
      data-testid="case-proposal"
      data-case-id={shown.id}
      data-state={shown.state}
      p={10}
      style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "var(--color-bg-muted)" }}
    >
      <Group justify="space-between" gap={6} wrap="nowrap" mb={4}>
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <Badge size="xs" variant="outline" color="gray" data-testid="case-proposal-source-kind">
            {tEnrichment("tier.web")}
          </Badge>
          <Text size="xs" c="var(--color-text-muted)" truncate>
            {[format.dateTime(new Date(shown.occurredAt), "short"), shown.locationLabel, scope].filter(Boolean).join(" · ")}
          </Text>
        </Group>
        <Badge size="xs" variant="light" color={STATE_COLOR[shown.state] ?? "gray"} data-testid="case-proposal-state">
          {tEnrichment(`prior.${shown.state}`)}
        </Badge>
      </Group>

      <Text size="xs" c="var(--color-text-secondary)" lineClamp={4} style={{ fontStyle: "italic" }} dir="auto">
        “{shown.quote}”
      </Text>

      {figures.length > 0 && (
        <Group gap={6} mt={6} wrap="wrap" data-testid="case-proposal-figures">
          {figures.map((figure, i) => (
            <Badge key={i} size="sm" variant="light" color="gray" style={{ textTransform: "none" }} data-testid="case-proposal-figure">
              {isCaseMetric(figure.metric) ? t(`metric.${figure.metric}`) : figure.metric}:{" "}
              {figureText(figure, (n) => format.number(n))}
            </Badge>
          ))}
        </Group>
      )}

      <Group gap={12} mt={6} wrap="wrap">
        {source ? (
          <Anchor href={source} target="_blank" rel="noopener noreferrer" size="xs" data-testid="case-proposal-source">
            {tEnrichment("source")}
          </Anchor>
        ) : (
          <Text size="xs" c="var(--color-text-muted)" data-testid="enrichment-unsafe-source">
            {tEnrichment("source")}: {shown.sourceUrl}
          </Text>
        )}
        {shown.matchedEventId && (
          <Anchor href={`/event/${encodeURIComponent(shown.matchedEventId)}`} size="xs" data-testid="case-proposal-matched-event">
            {t("matchesEvent")}
          </Anchor>
        )}
        {shown.state === "accepted" && shown.resultEventId && (
          <Anchor href={`/event/${encodeURIComponent(shown.resultEventId)}`} size="xs" fw={600} data-testid="case-proposal-result-event">
            {t("resultEvent")}
          </Anchor>
        )}
      </Group>

      {shown.state !== "proposed" && shown.decisionRationale && (
        <Text
          size="xs"
          mt={4}
          c={shown.state === "rejected" ? "var(--color-critical)" : "var(--color-text-muted)"}
          data-testid="case-proposal-rationale-shown"
        >
          {shown.decisionRationale}
        </Text>
      )}

      {decidable && (
        <Stack gap={8} mt={8} data-testid="case-proposal-decision">
          {rejecting && (
            <Textarea
              label={t("rationaleLabel")}
              placeholder={t("rationalePlaceholder")}
              value={rationale}
              onChange={(e) => setRationale(e.currentTarget.value)}
              onBlur={() => setTouched(true)}
              autosize
              minRows={2}
              maxRows={6}
              maxLength={MAX_RATIONALE_LENGTH + 1}
              disabled={decide.isPending}
              error={
                touched && missing ? t("rationaleRequired") : tooLong ? t("rationaleTooLong", { max: MAX_RATIONALE_LENGTH }) : undefined
              }
              data-testid="case-proposal-rationale"
              size="xs"
              autoFocus
            />
          )}
          <Group gap={8} wrap="wrap">
            {rejecting ? (
              <>
                <Button
                  size="xs"
                  variant="filled"
                  color="red"
                  leftSection={<IconCircleX size={14} />}
                  loading={decide.isPending}
                  disabled={decide.isPending || stale}
                  onClick={() => submit("rejected")}
                  data-testid="case-proposal-confirm-reject"
                >
                  {t("confirmReject")}
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  disabled={decide.isPending}
                  onClick={() => {
                    setRejecting(false);
                    setTouched(false);
                  }}
                  data-testid="case-proposal-cancel-reject"
                >
                  {t("cancel")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="xs"
                  variant="filled"
                  color="green"
                  leftSection={<IconCircleCheck size={14} />}
                  loading={decide.isPending && decide.variables?.decision === "accepted"}
                  disabled={decide.isPending || stale}
                  onClick={() => submit("accepted")}
                  data-testid="case-proposal-accept"
                >
                  {t("accept")}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  color="red"
                  leftSection={<IconCircleX size={14} />}
                  disabled={decide.isPending || stale}
                  onClick={() => setRejecting(true)}
                  data-testid="case-proposal-reject"
                >
                  {t("reject")}
                </Button>
              </>
            )}
          </Group>
        </Stack>
      )}
      {decide.isError && (
        <Text size="xs" mt={6} c="var(--color-critical)" role="alert" data-testid="case-proposal-error">
          {stale ? `${t("conflict")} ${decide.error.message}` : decide.error.message}
        </Text>
      )}
    </Box>
  );
}
