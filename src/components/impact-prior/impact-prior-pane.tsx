"use client";

import { useState } from "react";
import { Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { IconCircleX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { MAX_RATIONALE_LENGTH } from "~/lib/impact-prior-review";
import type { GqlImpactPrior, GqlImpactPriorDecision } from "~/lib/types/graphql";
import { ImpactPriorCard } from "./impact-prior-card";

export interface ImpactPriorPaneProps {
  prior: GqlImpactPrior;
  /** Client twin of clear-api's decider gate (admins and analysts); the
   * server is the real gate. Without it the pane is the card alone. */
  canDecide: boolean;
  /** The decision was recorded; the caller advances, toasts, refetches. */
  onDecided?: (prior: GqlImpactPrior, decision: GqlImpactPriorDecision) => void;
}

/**
 * A proposed ImpactPrior with its decision controls (clear-api ADR-0010,
 * V2): the evidence card, a required rationale, and the decision. Mounted
 * through two doors — the Inbox's Review item and the Event page's
 * Enrichment section — so the decision is the same wherever it is taken.
 * Only a proposed prior is decidable; the server rejects anything else
 * with CONFLICT, which is shown as is. Key it by `prior.id` so a drafted
 * rationale never carries over to another prior.
 */
export function ImpactPriorPane({ prior, canDecide, onDecided }: ImpactPriorPaneProps) {
  const t = useTranslations("impactPriorReview");
  const utils = api.useUtils();
  const [rationale, setRationale] = useState("");
  const [touched, setTouched] = useState(false);
  const decide = api.tasks.decideImpactPrior.useMutation();

  const trimmed = rationale.trim();
  const missing = trimmed.length === 0;
  const tooLong = trimmed.length > MAX_RATIONALE_LENGTH;
  const decidable = canDecide && prior.state === "proposed";

  const submit = (decision: GqlImpactPriorDecision) => {
    setTouched(true);
    if (missing || tooLong || decide.isPending) return;
    decide.mutate(
      { id: prior.id, decision, rationale: trimmed },
      {
        onSuccess: (decided) => {
          void utils.tasks.proposedImpactPriors.invalidate();
          void utils.tasks.forEvent.invalidate({ eventId: prior.eventId });
          onDecided?.(decided, decision);
        },
      },
    );
  };

  return (
    <Stack gap={12} data-testid="impact-prior-pane" data-state={prior.state}>
      <ImpactPriorCard prior={prior} />
      {decidable && (
        <Stack gap={8} data-testid="impact-prior-decision">
          <Text size="xs" c="var(--color-text-muted)">
            {t("help")}
          </Text>
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
            error={touched && missing ? t("rationaleRequired") : tooLong ? t("rationaleTooLong", { max: MAX_RATIONALE_LENGTH }) : undefined}
            data-testid="impact-prior-rationale"
            size="xs"
          />
          <Group gap={8} wrap="wrap">
            <Button
              size="xs"
              variant="outline"
              color="red"
              leftSection={<IconCircleX size={14} />}
              loading={decide.isPending && decide.variables?.decision === "rejected"}
              disabled={decide.isPending}
              onClick={() => submit("rejected")}
              data-testid="impact-prior-reject"
            >
              {t("reject")}
            </Button>
            {decide.isError && (
              <Text size="xs" c="var(--color-critical)" role="alert" data-testid="impact-prior-error">
                {decide.error.message}
              </Text>
            )}
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
