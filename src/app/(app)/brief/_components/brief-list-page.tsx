"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ActionIcon, Box, Button, Card, Menu, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconPlus, IconTrash, IconUsers } from "@tabler/icons-react";
import { DataTable, PageHeader, Table } from "~/components/ui";
import { api } from "~/trpc/react";
import { BRIEF_CADENCES, type BriefCadence, type BriefSummary } from "~/lib/brief/types";
import { NewBriefModal } from "./new-brief-modal";
import { BriefStatusBadge } from "./brief-status-badge";
import { RecipientListsDrawer } from "./recipient-lists-drawer";

const NO_RETRY = new Set(["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED"]);

/** /brief: past Briefs, newest first, and the way to start a new one. */
export function BriefListPage() {
  const t = useTranslations("brief");
  const format = useFormatter();
  const utils = api.useUtils();
  const [cadence, setCadence] = useState<BriefCadence | null>(null);
  // `?lists=1` opens the Recipient lists (the send dialog links here).
  const router = useRouter();
  const pathname = usePathname();
  const listsOpen = useSearchParams().get("lists") === "1";
  const setListsOpen = (open: boolean) => router.replace(open ? `${pathname}?lists=1` : pathname, { scroll: false });
  const query = api.briefs.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
  });
  const remove = api.briefs.delete.useMutation({
    onSuccess: () => utils.briefs.list.invalidate(),
    onError: (err) => notifications.show({ color: "red", message: t("list.deleteError", { message: err.message }) }),
  });
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });

  return (
    <Box>
      <PageHeader title={t("page.title")} breadcrumbs={["CLEAR", t("page.breadcrumb")]} loading={query.isFetching}>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconUsers size={14} />}
          onClick={() => setListsOpen(true)}
          data-testid="brief-recipient-lists"
        >
          {t("lists.open")}
        </Button>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <Button size="xs" leftSection={<IconPlus size={14} />} rightSection={<IconChevronDown size={14} />} data-testid="brief-new">
              {t("list.new")}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {BRIEF_CADENCES.map((c) => (
              <Menu.Item key={c} onClick={() => setCadence(c)} data-testid={`brief-new-${c}`}>
                {t(`new.title.${c}`)}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </PageHeader>

      <Box p={{ base: 16, sm: 24 }}>
        {query.error ? (
          <Text c="var(--color-text-primary)">{t("list.loadError")}</Text>
        ) : (
          <Card p={0} style={{ border: "1px solid var(--color-border)", overflow: "hidden" }}>
            <Box style={{ overflowX: "auto" }}>
              <DataTable<BriefSummary>
                columns={[
                  { label: t("list.columns.title") },
                  { label: t("list.columns.area") },
                  { label: t("list.columns.window") },
                  { label: t("list.columns.status") },
                  { label: t("list.columns.sentAt") },
                  { label: "", width: 40 },
                ]}
                data={query.data ?? []}
                loading={query.isLoading}
                emptyMessage={t("list.empty")}
                renderRow={(brief) => (
                  <Table.Tr key={brief.id} data-testid="brief-row">
                    <Table.Td style={{ minWidth: 200 }}>
                      <Link href={`/brief/${brief.id}`} style={{ textDecoration: "none" }}>
                        <Text fw={600} size="sm" c="var(--color-text-primary)">
                          {brief.title}
                        </Text>
                      </Link>
                      <Text size="xs" c="var(--color-text-muted)">
                        {t(`cadence.${brief.cadence}`)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="var(--color-text-secondary)">
                        {brief.locationName}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ whiteSpace: "nowrap" }}>
                      <Text size="sm" c="var(--color-text-secondary)">
                        {when(brief.windowStart)} → {when(brief.windowEnd)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <BriefStatusBadge status={brief.status} />
                    </Table.Td>
                    <Table.Td style={{ whiteSpace: "nowrap" }}>
                      <Text size="sm" c="var(--color-text-secondary)">
                        {brief.sentAt ? when(brief.sentAt) : "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {brief.status === "draft" && (
                        <Tooltip label={t("list.delete")}>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={t("list.delete")}
                            loading={remove.isPending && remove.variables?.id === brief.id}
                            onClick={() => {
                              if (window.confirm(t("list.deleteConfirm", { title: brief.title }))) {
                                remove.mutate({ id: brief.id });
                              }
                            }}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Table.Td>
                  </Table.Tr>
                )}
              />
            </Box>
          </Card>
        )}
      </Box>

      <NewBriefModal cadence={cadence} onClose={() => setCadence(null)} />
      <RecipientListsDrawer opened={listsOpen} onClose={() => setListsOpen(false)} />
    </Box>
  );
}
