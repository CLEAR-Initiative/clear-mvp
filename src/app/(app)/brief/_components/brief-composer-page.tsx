"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Box, Button, Center, Grid, Loader, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMailForward } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui";
import { api } from "~/trpc/react";
import type { Brief } from "~/lib/brief/types";
import { useBriefItems } from "../_hooks/use-brief-items";
import { BriefComposer } from "./brief-composer";
import { BriefPicker } from "./brief-picker";

const NO_RETRY = new Set(["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED", "NOT_FOUND"]);

/** /brief/[id]: loads the Brief and lays out the composer and the History list. */
export function BriefComposerPage({ briefId }: { briefId: string }) {
  const t = useTranslations("brief");
  const query = api.briefs.get.useQuery(
    { id: briefId },
    {
      refetchOnWindowFocus: false,
      retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
    },
  );

  if (query.isLoading) {
    return (
      <Center py={80}>
        <Loader size="sm" />
      </Center>
    );
  }
  if (query.error || !query.data) {
    return (
      <Box>
        <PageHeader title={t("page.title")} breadcrumbs={["CLEAR", t("page.breadcrumb")]} />
        <Stack p={24} gap={8} align="flex-start">
          <Text c="var(--color-text-primary)">{query.error ? t("composer.loadError") : t("composer.notFound")}</Text>
          <Button component={Link} href="/brief" variant="default" size="xs">
            {t("composer.back")}
          </Button>
        </Stack>
      </Box>
    );
  }
  return <Composer brief={query.data} />;
}

function Composer({ brief }: { brief: Brief }) {
  const t = useTranslations("brief");
  const items = useBriefItems(brief);
  const sendTest = api.briefs.sendTest.useMutation({
    onSuccess: (accepted) =>
      notifications.show(
        accepted
          ? { color: "green", message: t("send.testSent") }
          : { color: "red", message: t("send.testRefused") },
      ),
    onError: (err) => notifications.show({ color: "red", message: t("send.testError", { message: err.message }) }),
  });

  return (
    <Box>
      <PageHeader title={brief.title} breadcrumbs={["CLEAR", t("page.breadcrumb")]}>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconMailForward size={14} />}
          loading={sendTest.isPending}
          onClick={() => sendTest.mutate({ id: brief.id })}
          data-testid="brief-send-test"
        >
          {t("send.test")}
        </Button>
      </PageHeader>
      <Grid p={{ base: 16, sm: 24 }} gutter={24}>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <BriefComposer brief={brief} items={items} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <BriefPicker brief={brief} items={items} />
        </Grid.Col>
      </Grid>
    </Box>
  );
}
