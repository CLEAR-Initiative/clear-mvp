"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, Card, Group, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconRefresh } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { Brief } from "~/lib/brief/types";
import type { BriefItemsApi, TrackSave } from "../_hooks/use-brief-items";
import type { BriefText } from "../_hooks/use-brief-autosave";
import { toBriefView } from "~/lib/brief/view";
import { useBriefViewLabels } from "../_hooks/use-brief-view-labels";
import { MarkdownLite } from "./markdown-lite";
import { BriefCounts } from "./brief-counts";
import { BriefItems } from "./brief-items";
import type { PreviewTarget } from "../_lib/preview-target";
import type { SetDirty } from "../_hooks/use-save-tracker";

export interface BriefComposerProps {
  brief: Brief;
  items: BriefItemsApi;
  /** The text being edited (autosaved by the page). */
  text: BriefText;
  onTextChange: (field: keyof BriefText, value: string) => void;
  track: TrackSave;
  setDirty: SetDirty;
  onPreview: (target: PreviewTarget) => void;
}

/**
 * The left half of the composer: the Brief itself, in fixed sections. A sent
 * Brief renders read-only.
 */
export function BriefComposer({ brief, items, text, onTextChange, track, setDirty, onPreview }: BriefComposerProps) {
  const t = useTranslations("brief");
  const format = useFormatter();
  const utils = api.useUtils();
  const refresh = api.briefs.refreshWindow.useMutation();
  const editable = brief.status === "draft";
  const labels = useBriefViewLabels();
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });
  const view = toBriefView(brief, labels);

  const refreshToNow = () =>
    void track(refresh.mutateAsync({ id: brief.id }))
      .then((fresh) => utils.briefs.get.setData({ id: brief.id }, (old) => (old ? { ...fresh, items: old.items } : fresh)))
      .catch((err: unknown) =>
        notifications.show({
          color: "red",
          message: t("composer.refreshError", { message: err instanceof Error ? err.message : String(err) }),
        }),
      );

  return (
    <Card p={16} style={{ border: "1px solid var(--color-border)" }} data-testid="brief-composer">
      <Stack gap={20}>
        <Stack gap={6}>
          {editable ? (
            <TextInput
              value={text.title}
              onChange={(e) => onTextChange("title", e.currentTarget.value)}
              aria-label={t("composer.titleLabel")}
              error={text.title.trim() === "" ? t("composer.titleRequired") : undefined}
              variant="unstyled"
              styles={{ input: { fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" } }}
              data-testid="brief-title"
            />
          ) : (
            <Text fw={700} style={{ fontSize: 18 }} c="var(--color-text-primary)">
              {brief.title}
            </Text>
          )}
          <Group gap={8} wrap="wrap">
            <Text size="sm" c="var(--color-text-secondary)" data-testid="brief-window">
              {t("composer.window", { start: when(brief.windowStart), end: when(brief.windowEnd) })}
            </Text>
            {editable && (
              <Button
                size="compact-xs"
                variant="subtle"
                color="gray"
                leftSection={<IconRefresh size={12} />}
                loading={refresh.isPending}
                onClick={refreshToNow}
                data-testid="brief-refresh"
              >
                {t("composer.refresh")}
              </Button>
            )}
          </Group>
          <Text size="xs" c="var(--color-text-muted)">
            {brief.locationName} · {t(`cadence.${brief.cadence}`)}
          </Text>
        </Stack>

        <Section n={1} title={t("sections.summary")}>
          <MarkdownField
            value={text.summary}
            onChange={editable ? (v) => onTextChange("summary", v) : undefined}
            label={t("sections.summary")}
            testId="brief-summary"
          />
        </Section>

        <Section n={2} title={t("sections.counts")}>
          <BriefCounts rows={view.counts} />
        </Section>

        <Section n={3} title={t("sections.items")}>
          <BriefItems
            groups={view.groups}
            items={items}
            rawItems={brief.items}
            editable={editable}
            onPreview={onPreview}
            setDirty={setDirty}
          />
        </Section>

        <Section n={4} title={t("sections.closingNotes")}>
          <MarkdownField
            value={text.closingNotes}
            onChange={editable ? (v) => onTextChange("closingNotes", v) : undefined}
            label={t("sections.closingNotes")}
            testId="brief-closing-notes"
          />
        </Section>
      </Stack>
    </Card>
  );
}

/** A numbered Brief section, numbered as the PDF numbers it. */
export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Stack gap={8} component="section">
      <Text fw={700} size="sm" c="var(--color-text-primary)">
        {n}. {title}
      </Text>
      {children}
    </Stack>
  );
}

/** Markdown-lite text: a textarea with its rendered preview, or just the rendering when read-only. */
function MarkdownField({
  value,
  onChange,
  label,
  testId,
}: {
  value: string;
  onChange?: (value: string) => void;
  label: string;
  testId: string;
}) {
  const t = useTranslations("brief");
  if (!onChange) {
    return value.trim() ? (
      <MarkdownLite text={value} />
    ) : (
      <Text size="sm" c="var(--color-text-muted)">
        {t("composer.empty")}
      </Text>
    );
  }
  return (
    <Stack gap={6}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        aria-label={label}
        autosize
        minRows={3}
        maxRows={14}
        description={t("composer.markdownHint")}
        data-testid={testId}
      />
      {value.trim() && (
        <Stack
          gap={2}
          p={10}
          style={{ background: "var(--color-bg-muted)", borderRadius: 4 }}
          data-testid={`${testId}-preview`}
        >
          <Text size="xs" fw={700} tt="uppercase" c="var(--color-text-muted)">
            {t("composer.preview")}
          </Text>
          <MarkdownLite text={value} size={13} />
        </Stack>
      )}
    </Stack>
  );
}
