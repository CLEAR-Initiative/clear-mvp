"use client";

import { useState } from "react";
import {
  Modal, Stack, Select, Textarea, Button, Group, Text, Box,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import { IconCircleCheck } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { getConsoleBuffer } from "~/lib/console-buffer";

type FeedbackType = "Bug" | "Feature Request" | "General";

interface FeedbackModalProps {
  opened: boolean;
  onClose: () => void;
}

export function FeedbackModal({ opened, onClose }: FeedbackModalProps) {
  const t = useTranslations("common.feedback");
  const tActions = useTranslations("common.actions");
  const [type, setType] = useState<FeedbackType>("General");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const user = authData?.user;

  function handleClose() {
    setType("General");
    setMessage("");
    setSubmitted(false);
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        type,
        message: message.trim(),
        userEmail: user?.email ?? "unknown",
        pageUrl: window.location.href,
        ...(type === "Bug" && { consoleLogs: getConsoleBuffer() }),
      };
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json() as { error: string; detail?: string };
        throw new Error(data.detail ?? data.error ?? "Failed to submit");
      }
      setSubmitted(true);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={submitted ? undefined : t("title")}
      size="sm"
      centered
      styles={{
        title: { fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" },
        body: { paddingTop: submitted ? 0 : 8 },
      }}
    >
      {submitted ? (
        <Stack align="center" gap={12} py={28}>
          <IconCircleCheck size={52} color="var(--color-success)" style={{ strokeWidth: 1.5 }} />
          <Text fw={700} size="lg" c="var(--color-text-primary)">{t("thanks")}</Text>
          <Text size="sm" c="var(--color-text-muted)" ta="center" maw={260}>
            {t("received")}
          </Text>
          <Button variant="subtle" color="gray" size="sm" mt={4} onClick={handleClose}>
            {tActions("close")}
          </Button>
        </Stack>
      ) : (
        <Stack gap={14}>
          <Select
            label={t("type")}
            data={[
              // values are raw API payload values; labels translated for display
              { value: "Bug", label: t("types.bug") },
              { value: "Feature Request", label: t("types.feature") },
              { value: "General", label: t("types.general") },
            ]}
            value={type}
            onChange={(v) => v && setType(v as FeedbackType)}
            styles={{ label: { fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 } }}
          />
          <Textarea
            label={t("message")}
            placeholder={
              type === "Bug"
                ? t("placeholderBug")
                : type === "Feature Request"
                ? t("placeholderFeature")
                : t("placeholderGeneral")
            }
            value={message}
            onChange={(e) => setMessage(e.currentTarget.value)}
            minRows={4}
            autosize
            maxRows={8}
            maxLength={2000}
            styles={{ label: { fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 } }}
          />
          {type === "Bug" && (
            <Box
              p={10}
              style={{
                background: "var(--color-bg-muted)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
              }}
            >
              <Text size="xs" c="var(--color-text-muted)" style={{ lineHeight: 1.5 }}>
                {t("consoleNote", { count: getConsoleBuffer().length })}
              </Text>
            </Box>
          )}
          {error && (
            <Text size="xs" c="var(--color-critical)">{error}</Text>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" size="sm" onClick={handleClose}>
              {tActions("cancel")}
            </Button>
            <Button
              size="sm"
              disabled={!message.trim()}
              loading={loading}
              onClick={() => void handleSubmit()}
              style={{ background: "var(--color-accent)", borderColor: "var(--color-accent)", fontSize: 12 }}
            >
              {t("send")}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
