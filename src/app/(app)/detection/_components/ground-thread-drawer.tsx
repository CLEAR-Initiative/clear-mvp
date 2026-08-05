"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useFormatter } from "next-intl";
import { Badge, Box, Button, Drawer, Group, Loader, Stack, Text } from "@mantine/core";
import { IconPaperclip } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { GqlGroundMessage, GqlGroundThreadDetail } from "~/lib/types/graphql";
import { allowedReviewDecisions, canReviewSource, type GroundReviewDecision } from "~/lib/ground-review";
import { activeReviewHelp, clearedReviewHelp, reviewHelpMessageKey } from "~/lib/ground-review-help";
import { isGroundSourceKind, senderDisplay } from "~/lib/ground-source";
import { ClassificationPill, messageClassification } from "./ground-intel-tab";

/**
 * Ground thread drawer — one thread (a cluster of staged Signals) with
 * its correction chain.
 *
 * PRIVATE TIER: renders `senderName`, which is allowed in the detection
 * Ground-intel surfaces ONLY (see ground-intel-tab.tsx for the rules).
 */

const LIFECYCLE_STATES = ["reported", "updated", "confirmed", "corrected", "retracted"] as const;
type LifecycleState = (typeof LIFECYCLE_STATES)[number];
const REVIEW_STATES = ["unverified", "approved_private", "approved_public", "rejected"] as const;
type ReviewState = (typeof REVIEW_STATES)[number];

function isLifecycleState(v: string): v is LifecycleState {
  return (LIFECYCLE_STATES as readonly string[]).includes(v);
}
function isReviewState(v: string): v is ReviewState {
  return (REVIEW_STATES as readonly string[]).includes(v);
}

const LIFECYCLE_STYLES: Record<string, { bg: string; color: string }> = {
  reported:  { bg: "var(--color-info-light)",     color: "var(--color-info)" },
  updated:   { bg: "var(--color-ai-light)",       color: "var(--color-ai)" },
  confirmed: { bg: "var(--color-success-light)",  color: "var(--color-success)" },
  corrected: { bg: "var(--color-warning-light)",  color: "var(--color-warning)" },
  retracted: { bg: "var(--color-critical-light)", color: "var(--color-critical)" },
};

const SOURCE_KIND_STYLES: Record<string, { bg: string; color: string }> = {
  staff_group:   { bg: "var(--color-info-light)",    color: "var(--color-info)" },
  partner_group: { bg: "var(--color-ai-light)",      color: "var(--color-ai)" },
  hotline:       { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
};

const REVIEW_STATE_STYLES: Record<string, { bg: string; color: string }> = {
  unverified:       { bg: "var(--color-bg-muted)",       color: "var(--color-text-muted)" },
  approved_private: { bg: "var(--color-info-light)",     color: "var(--color-info)" },
  approved_public:  { bg: "var(--color-success-light)",  color: "var(--color-success)" },
  rejected:         { bg: "var(--color-critical-light)", color: "var(--color-critical)" },
};

function statePill(
  label: string,
  style: { bg: string; color: string } | undefined,
  testId: string,
) {
  return (
    <span
      data-testid={testId}
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        background: style?.bg ?? "var(--color-bg-muted)",
        color: style?.color ?? "var(--color-text-muted)",
      }}
    >
      {label}
    </span>
  );
}

export function LifecycleBadge({ state }: { state: string }) {
  const t = useTranslations("detection");
  return statePill(
    isLifecycleState(state) ? t(`groundIntel.lifecycle.${state}`) : state,
    LIFECYCLE_STYLES[state],
    "ground-lifecycle-badge",
  );
}

/** Source kind pill (staff group / partner group / hotline). Unknown kinds render verbatim. */
export function SourceKindBadge({ kind }: { kind: string }) {
  const t = useTranslations("detection");
  return statePill(
    isGroundSourceKind(kind) ? t(`groundIntel.sourceKinds.${kind}`) : kind,
    SOURCE_KIND_STYLES[kind],
    "ground-source-kind-badge",
  );
}

export function ReviewStateBadge({ state }: { state: string }) {
  const t = useTranslations("detection");
  return statePill(
    isReviewState(state) ? t(`groundIntel.reviewStates.${state}`) : state,
    REVIEW_STATE_STYLES[state],
    "ground-review-state-badge",
  );
}

/**
 * Chain-step label for a message inside a thread. The first message is
 * the original report; V1 threads carry lifecycle at thread level, so
 * the closing state (corrected / retracted / confirmed) is displayed on
 * the LAST message of the chain and everything in between reads as an
 * update. This keeps the correction chain readable without pretending
 * we have per-message lifecycle data.
 */
export function chainStep(
  index: number,
  total: number,
  lifecycleState: string,
): "reported" | "updated" | "confirmed" | "corrected" | "retracted" {
  if (index === 0) return "reported";
  const isLast = index === total - 1;
  if (isLast && (lifecycleState === "corrected" || lifecycleState === "retracted" || lifecycleState === "confirmed")) {
    return lifecycleState;
  }
  return "updated";
}

interface GroundThreadDrawerProps {
  threadId: string | null;
  opened: boolean;
  onClose: () => void;
}

/**
 * Hover/focus callbacks the drawer passes down so the review buttons can
 * drive the help panel that renders in the drawer's footer area. Keyboard
 * focus is treated as hover (accessibility); `clear` handles the unmount
 * paths (click → confirm step / refetch) where leave/blur never fire.
 */
interface ReviewHelpHandlers {
  enter: (decision: GroundReviewDecision) => void;
  leave: (decision: GroundReviewDecision) => void;
  focus: (decision: GroundReviewDecision) => void;
  blur: (decision: GroundReviewDecision) => void;
  clear: (decision: GroundReviewDecision) => void;
}

/** Title accent per action — mirrors REVIEW_STATE_STYLES accents. */
const REVIEW_HELP_TITLE_COLORS: Record<GroundReviewDecision, string> = {
  approve_private: "var(--color-info)",
  approve_public: "var(--color-success)",
  reject: "var(--color-critical)",
};

/**
 * Role-gated review controls. Buttons render only when the current
 * user's global role passes the source's `reviewerRoles` policy record
 * (platform admins always pass) — mirroring clear-api's authorization so
 * unauthorized roles never see actions that are guaranteed to 403.
 * Decisions are limited to what the V1 state machine allows from the
 * thread's current review state; approved_public is terminal.
 */
function GroundReviewActions({
  thread,
  help,
}: {
  thread: GqlGroundThreadDetail;
  help: ReviewHelpHandlers;
}) {
  const t = useTranslations("detection");
  const utils = api.useUtils();
  const [confirmingPublish, setConfirmingPublish] = useState(false);

  /** Hover + focus wiring for one review action button. */
  const helpProps = (decision: GroundReviewDecision) => ({
    onMouseEnter: () => help.enter(decision),
    onMouseLeave: () => help.leave(decision),
    onFocus: () => help.focus(decision),
    onBlur: () => help.blur(decision),
  });

  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const canReview = canReviewSource(authData?.user?.role, thread.source.reviewerRoles);
  const allowed = allowedReviewDecisions(thread.reviewState);

  const review = api.ground.review.useMutation({
    onSuccess: () => {
      setConfirmingPublish(false);
      void utils.ground.thread.invalidate({ id: thread.id });
      void utils.ground.threads.invalidate();
      void utils.ground.messages.invalidate();
    },
  });

  const decide = (decision: GroundReviewDecision) => {
    // Buttons can unmount on success without firing leave/blur — drop
    // the help explicitly so the panel never sticks around.
    help.clear(decision);
    review.mutate({ id: thread.id, decision });
  };

  if (thread.reviewState === "approved_public") {
    return (
      <Box data-testid="ground-review-final">
        <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>
          {t("groundIntel.review.finalNotice")}
        </Text>
        {thread.promotedSignalId && (
          <Link href={`/signal/${thread.promotedSignalId}`} style={{ fontSize: 12 }}>
            {t("groundIntel.review.viewSignal")}
          </Link>
        )}
      </Box>
    );
  }

  if (!canReview || allowed.length === 0) return null;

  return (
    <Box data-testid="ground-review-actions">
      {confirmingPublish ? (
        <Group gap={8} wrap="wrap">
          <Text style={{ fontSize: 12, color: "var(--color-warning)" }}>
            {t("groundIntel.review.confirmPublish")}
          </Text>
          <Button
            size="compact-xs"
            color="green"
            loading={review.isPending}
            onClick={() => decide("approve_public")}
            data-testid="ground-confirm-publish"
          >
            {t("groundIntel.review.confirm")}
          </Button>
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            disabled={review.isPending}
            onClick={() => setConfirmingPublish(false)}
          >
            {t("groundIntel.review.cancel")}
          </Button>
        </Group>
      ) : (
        <Group gap={8} wrap="wrap">
          {allowed.includes("approve_private") && (
            <Button
              size="compact-sm"
              variant="outline"
              color="blue"
              loading={review.isPending}
              onClick={() => decide("approve_private")}
              data-testid="ground-approve-private"
              {...helpProps("approve_private")}
            >
              {t("groundIntel.review.approvePrivate")}
            </Button>
          )}
          {allowed.includes("approve_public") && (
            <Button
              size="compact-sm"
              color="green"
              disabled={review.isPending}
              onClick={() => {
                // Switching to the confirm step unmounts this button
                // without leave/blur firing — clear the help by hand.
                help.clear("approve_public");
                setConfirmingPublish(true);
              }}
              data-testid="ground-approve-public"
              {...helpProps("approve_public")}
            >
              {t("groundIntel.review.approvePublic")}
            </Button>
          )}
          {allowed.includes("reject") && (
            <Button
              size="compact-sm"
              variant="outline"
              color="red"
              loading={review.isPending}
              onClick={() => decide("reject")}
              data-testid="ground-reject"
              {...helpProps("reject")}
            >
              {t("groundIntel.review.reject")}
            </Button>
          )}
        </Group>
      )}
      {review.error && (
        <Text mt={6} style={{ fontSize: 12, color: "var(--color-critical)" }}>
          {review.error.message}
        </Text>
      )}
    </Box>
  );
}

function ChainMessage({
  message,
  step,
  sourceKind,
}: {
  message: GqlGroundMessage;
  step: ReturnType<typeof chainStep>;
  sourceKind: string;
}) {
  const t = useTranslations("detection");
  const format = useFormatter();
  const style = LIFECYCLE_STYLES[step];
  const mediaCount = message.mediaRefs.length + message.omittedMediaCount;
  // Hotline sources have no sender identity — per-conversation pseudonym
  // or an em dash, never a blank (see ~/lib/ground-source.ts).
  const sender = senderDisplay(message, sourceKind);
  return (
    <Group gap={12} align="flex-start" style={{ position: "relative" }} data-testid="ground-chain-message">
      <Box
        style={{
          width: 10,
          height: 10,
          marginTop: 5,
          background: style?.color ?? "var(--color-border-dark)",
          borderRadius: "50%",
          flexShrink: 0,
          zIndex: 1,
        }}
      />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group gap={8} mb={2} wrap="wrap">
          {statePill(t(`groundIntel.lifecycle.${step}`), style, "ground-chain-step")}
          {/* Private tier: raw sender display name renders in ground surfaces only. */}
          <Text fw={600} style={{ fontSize: 12 }}>
            {sender.primary}
          </Text>
          <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
            {format.dateTime(new Date(message.sentAt), "short")}
          </Text>
        </Group>
        <Text style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          {message.text.length > 0 ? message.text : <em>{t("groundIntel.noText")}</em>}
        </Text>
        <Group gap={6} mt={4}>
          <ClassificationPill value={messageClassification(message)} />
          {message.uncertainty && (
            <Badge
              size="xs"
              variant="light"
              color="yellow"
              style={{ textTransform: "none" }}
              data-testid="ground-uncertainty-badge"
            >
              {message.uncertainty}
            </Badge>
          )}
          {message.isEdited && (
            <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
              {t("groundIntel.edited")}
            </Text>
          )}
          {mediaCount > 0 && (
            <Group gap={2}>
              <IconPaperclip size={12} color="var(--color-text-muted)" />
              <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                {mediaCount}
              </Text>
            </Group>
          )}
        </Group>
      </Box>
    </Group>
  );
}

export function GroundThreadDrawer({ threadId, opened, onClose }: GroundThreadDrawerProps) {
  const t = useTranslations("detection");
  const threadQuery = api.ground.thread.useQuery(
    { id: threadId ?? "" },
    { enabled: opened && threadId != null },
  );
  const thread = threadQuery.data;

  // Which review action's explanation to show in the footer panel.
  // Hover and keyboard focus are tracked separately so one can end
  // without clobbering the other; see ~/lib/ground-review-help.ts.
  const [hoveredAction, setHoveredAction] = useState<GroundReviewDecision | null>(null);
  const [focusedAction, setFocusedAction] = useState<GroundReviewDecision | null>(null);
  const helpDecision = activeReviewHelp(hoveredAction, focusedAction);

  useEffect(() => {
    // New thread / reopen: never carry a stale help panel over.
    setHoveredAction(null);
    setFocusedAction(null);
  }, [threadId, opened]);

  const reviewHelp: ReviewHelpHandlers = {
    enter: (d) => setHoveredAction(d),
    leave: (d) => setHoveredAction((cur) => clearedReviewHelp(cur, d)),
    focus: (d) => setFocusedAction(d),
    blur: (d) => setFocusedAction((cur) => clearedReviewHelp(cur, d)),
    clear: (d) => {
      setHoveredAction((cur) => clearedReviewHelp(cur, d));
      setFocusedAction((cur) => clearedReviewHelp(cur, d));
    },
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      title={
        <Text fw={600} style={{ fontSize: 15 }}>
          {thread?.title ?? t("groundIntel.thread.untitled")}
        </Text>
      }
      overlayProps={{ opacity: 0.3 }}
    >
      {threadQuery.isLoading ? (
        <Box p={32} style={{ textAlign: "center" }}>
          <Loader size="sm" />
        </Box>
      ) : !thread ? (
        <Text c="var(--color-text-muted)" style={{ fontSize: 13 }}>
          {t("groundIntel.thread.notFound")}
        </Text>
      ) : (
        <Stack gap={16} data-testid="ground-thread-view">
          <Group gap={8} wrap="wrap">
            <LifecycleBadge state={thread.lifecycleState} />
            <ReviewStateBadge state={thread.reviewState} />
            <SourceKindBadge kind={thread.source.kind} />
            <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>
              {thread.source.name}
            </Text>
          </Group>

          {thread.reviewNote && (
            <Box
              px={12}
              py={8}
              style={{
                background: "var(--color-bg-muted)",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
              }}
            >
              <Text c="var(--color-text-muted)" fw={600} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {t("groundIntel.thread.reviewNote")}
              </Text>
              <Text style={{ fontSize: 13 }}>{thread.reviewNote}</Text>
            </Box>
          )}

          <GroundReviewActions thread={thread} help={reviewHelp} />

          {/* Correction chain: messages in sent order along a timeline rail. */}
          <Box style={{ position: "relative" }}>
            <Box
              style={{
                position: "absolute",
                insetInlineStart: 4,
                top: 10,
                bottom: 10,
                width: 2,
                background: "var(--color-border)",
              }}
            />
            <Stack gap={18}>
              {thread.messages.map((m, i) => (
                <ChainMessage
                  key={m.id}
                  message={m}
                  step={chainStep(i, thread.messages.length, thread.lifecycleState)}
                  sourceKind={thread.source.kind}
                />
              ))}
            </Stack>
          </Box>

          {/*
           * Review-action help: explains the hovered/focused action in
           * the drawer's footer area. Sticky so it pins to the bottom
           * of the drawer viewport while the chain scrolls; hidden
           * entirely when no action is hovered or focused.
           */}
          {helpDecision && (
            <Box
              px={12}
              py={10}
              data-testid="ground-review-help"
              style={{
                position: "sticky",
                bottom: 0,
                background: "var(--color-bg-white)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Text fw={700} mb={2} style={{ fontSize: 12, color: REVIEW_HELP_TITLE_COLORS[helpDecision] }}>
                {t(`groundIntel.review.help.${reviewHelpMessageKey(helpDecision)}.title`)}
              </Text>
              <Text c="var(--color-text-muted)" style={{ fontSize: 12, lineHeight: 1.55 }}>
                {t(`groundIntel.review.help.${reviewHelpMessageKey(helpDecision)}.body`)}
              </Text>
            </Box>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
