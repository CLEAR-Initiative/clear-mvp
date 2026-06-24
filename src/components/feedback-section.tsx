"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Text, Group, Stack, Button, Textarea, Modal, Divider } from "@mantine/core";
import {
  IconThumbUp,
  IconThumbDown,
  IconCircleCheck,
  IconCircleOff,
  IconHistory,
  IconMapPinOff,
  IconAlertTriangle,
  IconGauge,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

// `id` is the raw value sent to the API; `labelKey` resolves the displayed
// label via common.feedbackSection.reasons.*
const ISSUE_TAGS = [
  { id: "not_relevant",   labelKey: "notRelevant",   icon: IconCircleOff },
  { id: "already_known",  labelKey: "alreadyKnown",  icon: IconHistory },
  { id: "wrong_area",     labelKey: "wrongArea",     icon: IconMapPinOff },
  { id: "wrong_severity", labelKey: "wrongSeverity", icon: IconGauge },
  { id: "inaccurate",     labelKey: "inaccurate",    icon: IconAlertTriangle },
] as const;

interface FeedbackSectionProps {
  entityId: string;
  entityType: "event" | "signal";
}

export function FeedbackSection({ entityId, entityType }: FeedbackSectionProps) {
  const t = useTranslations("common.feedbackSection");
  const tActions = useTranslations("common.actions");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitted, setModalSubmitted] = useState(false);
  const [helpfulSubmitted, setHelpfulSubmitted] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [modalComment, setModalComment] = useState("");

  const addFeedback = api.feedback.add.useMutation();

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function handleHelpful() {
    try {
      await addFeedback.mutateAsync({ entityId, entityType, rating: 5 });
      setHelpfulSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
  }

  async function handleSubmitIssues() {
    const parts = [selectedTags.join(", "), modalComment.trim()].filter(Boolean);
    try {
      await addFeedback.mutateAsync({
        entityId,
        entityType,
        rating: 1,
        text: parts.join(" | ") || undefined,
      });
      setModalSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
  }

  return (
    <>
      <Box px={16} py={10} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>
          {t(`question.${entityType}`)}
        </Text>
      </Box>
      <Box p={16}>
        {helpfulSubmitted ? (
          <Group gap={6} justify="center">
            <IconCircleCheck size={15} color="var(--color-success)" style={{ strokeWidth: 1.5 }} />
            <Text size="xs" style={{ color: "var(--color-success)" }} fw={500}>
              {t("thanksInline")}
            </Text>
          </Group>
        ) : (
          <Group gap={8}>
            <button
              onClick={() => {
                setModalOpen(true);
                setModalSubmitted(false);
                setSelectedTags([]);
                setModalComment("");
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: "var(--color-critical-light)",
                color: "#B91C1C",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FECACA")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-critical-light)")}
            >
              <IconThumbDown size={13} />
              {t("issues")}
            </button>
            <button
              onClick={handleHelpful}
              disabled={addFeedback.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: "var(--color-success-light)",
                color: "#065F46",
                border: "none",
                cursor: addFeedback.isPending ? "not-allowed" : "pointer",
                opacity: addFeedback.isPending ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!addFeedback.isPending) e.currentTarget.style.background = "#A7F3D0"; }}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-success-light)")}
            >
              <IconThumbUp size={13} />
              {t("helpful")}
            </button>
          </Group>
        )}
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalSubmitted ? undefined : t("modalTitle")}
        size="sm"
        centered
        styles={{
          header: { paddingBottom: 8 },
          body: { paddingTop: modalSubmitted ? 0 : 8 },
        }}
      >
        {modalSubmitted ? (
          <Stack align="center" gap={12} py={32}>
            <IconCircleCheck size={52} color="var(--color-success)" style={{ strokeWidth: 1.5 }} />
            <Text fw={700} size="lg" c="var(--color-text-primary)">
              {t("thankYou")}
            </Text>
            <Text size="sm" c="var(--color-text-muted)" ta="center" maw={260}>
              {t(`thanksBody.${entityType}`)}
            </Text>
            <Button variant="subtle" color="gray" size="sm" mt={8} onClick={() => setModalOpen(false)}>
              {tActions("close")}
            </Button>
          </Stack>
        ) : (
          <Stack gap={16}>
            <Text size="sm" c="var(--color-text-muted)">
              {t("selectIssues")}
            </Text>

            <Stack gap={8}>
              {ISSUE_TAGS.map(({ id, labelKey, icon: Icon }) => {
                const active = selectedTags.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleTag(id)}
                    className="transition-colors"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      width: "100%",
                      borderRadius: 999,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 500,
                      background: active ? "var(--color-critical-light)" : "var(--color-bg-muted)",
                      color: active ? "#B91C1C" : "var(--color-text-secondary)",
                      border: active
                        ? "1px solid #FECACA"
                        : "1px solid var(--color-border)",
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                    {t(`reasons.${labelKey}`)}
                  </button>
                );
              })}
            </Stack>

            <Divider color="var(--color-border)" />

            <Textarea
              label={t("commentsLabel")}
              placeholder={t(`commentsPlaceholder.${entityType}`)}
              value={modalComment}
              onChange={(e) => setModalComment(e.currentTarget.value)}
              minRows={3}
              maxLength={1000}
              size="sm"
              styles={{
                label: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: 6,
                },
              }}
            />

            <Group justify="flex-end">
              <Button variant="subtle" color="gray" size="sm" onClick={() => setModalOpen(false)}>
                {tActions("cancel")}
              </Button>
              <Button
                size="sm"
                disabled={selectedTags.length === 0 && !modalComment.trim()}
                loading={addFeedback.isPending}
                onClick={handleSubmitIssues}
                style={{ background: "var(--color-accent)", borderColor: "var(--color-accent)", fontSize: 12 }}
              >
                {t("send")}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
