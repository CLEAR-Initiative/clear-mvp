"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Badge, Box, Drawer, Group, Loader, Stack, Text } from "@mantine/core";
import { IconPaperclip } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { GqlGroundMessage, GqlGroundThreadDetail } from "~/lib/types/graphql";
import { ClassificationPill, messageClassification } from "./ground-intel-tab";

/**
 * Ground thread drawer — one incident thread with its correction chain.
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
  /** Review controls (action buttons) — injected by the tab so gating logic stays in one place. */
  renderActions?: (thread: GqlGroundThreadDetail) => React.ReactNode;
}

function ChainMessage({
  message,
  step,
}: {
  message: GqlGroundMessage;
  step: ReturnType<typeof chainStep>;
}) {
  const t = useTranslations("detection");
  const format = useFormatter();
  const style = LIFECYCLE_STYLES[step];
  const mediaCount = message.mediaRefs.length + message.omittedMediaCount;
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
            {message.senderName ?? message.senderRef}
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
            <Badge size="xs" variant="light" color="yellow" style={{ textTransform: "none" }}>
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

export function GroundThreadDrawer({ threadId, opened, onClose, renderActions }: GroundThreadDrawerProps) {
  const t = useTranslations("detection");
  const threadQuery = api.ground.thread.useQuery(
    { id: threadId ?? "" },
    { enabled: opened && threadId != null },
  );
  const thread = threadQuery.data;

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

          {renderActions?.(thread)}

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
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      )}
    </Drawer>
  );
}
