"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, Group, Stack, Text } from "@mantine/core";
import { CardSection } from "~/components/ui";
import { api } from "~/trpc/react";

/** How many questions one click shows. */
const FIRST = 20;

/**
 * The newest questions asked of the Agent, behind a click. clear-api logs
 * the read as an admin read of those Conversations, so the list is never
 * fetched with the page: the admin asks for it, and the note says what that
 * means. The user is never shown; clear-api does not send it. The click
 * covers one range: changing a date hides the list until the admin asks again.
 */
export function AgentQuestions({ input }: { input: { from?: string; to?: string } }) {
  const t = useTranslations("metrics.agent.questions");
  const format = useFormatter();
  const range = `${input.from ?? ""}|${input.to ?? ""}`;
  const [shownFor, setShownFor] = useState<string | null>(null);
  const shown = shownFor === range;
  const query = api.metrics.agentQuestions.useQuery(
    { ...input, first: FIRST },
    { enabled: shown, refetchOnWindowFocus: false, retry: false },
  );
  // After a failed read the button asks again; otherwise it is spent for this range.
  const ask = () => (shown ? void query.refetch() : setShownFor(range));
  const result = query.data;

  return (
    <CardSection
      title={t("title")}
      subtitle={t("subtitle")}
      action={
        <Button size="xs" variant="default" onClick={ask} disabled={shown && !query.error} loading={shown && query.isFetching}>
          {t("show", { n: FIRST })}
        </Button>
      }
    >
      {!shown ? (
        <Text size="xs" c="var(--color-text-muted)">
          {t("audit")}
        </Text>
      ) : query.error ? (
        <Text size="xs" c="var(--color-critical)" role="alert">
          {query.error.message}
        </Text>
      ) : !result ? (
        <Text size="xs" c="var(--color-text-muted)">
          {t("loading")}
        </Text>
      ) : result.status === "unavailable" ? (
        <Text size="xs" c="var(--color-text-muted)">
          {t("unavailable")}
        </Text>
      ) : result.questions.length === 0 ? (
        <Text size="xs" c="var(--color-text-muted)">
          {t("none")}
        </Text>
      ) : (
        <Stack gap={8} component="ol" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {result.questions.map((q, i) => (
            <li key={`${q.askedAt}-${i}`}>
              <Group gap={8} wrap="nowrap" align="baseline">
                <Text size="xs" c="var(--color-text-muted)" style={{ whiteSpace: "nowrap", minWidth: 96 }}>
                  {format.dateTime(new Date(q.askedAt), { dateStyle: "medium", timeZone: "UTC" })}
                </Text>
                <Text size="xs" c="var(--color-text-muted)" style={{ whiteSpace: "nowrap", minWidth: 72 }}>
                  {q.page === "unknown" ? t("unknownPage") : q.page}
                </Text>
                <Text size="sm" c="var(--color-text-primary)" style={{ overflowWrap: "anywhere" }}>
                  {q.question}
                </Text>
              </Group>
            </li>
          ))}
        </Stack>
      )}
    </CardSection>
  );
}
