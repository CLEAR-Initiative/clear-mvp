"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Button, Group, Modal, Select, Table, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { DataTable } from "~/components/ui/data-table";
import { PLACE_ALIAS_SOURCES, aliasErrorKey, aliasTargetPath, type PlaceAliasSource } from "~/lib/place-names";
import type { GqlPlaceAlias } from "~/lib/types/graphql";
import { AliasFormModal } from "./alias-form-modal";

/**
 * The place alias list (clear-api ADR-0019): the spellings CLEAR maps to its
 * own locations, the synonym list the Places queue builds up. A decider looks
 * a spelling up, sees where it points, corrects a wrong alias, and adds a
 * known spelling before any post uses it. Every decider reads the whole
 * list; the Edit and Delete actions show only on the aliases the reader may
 * change (`canEdit`: a team admin's own state, a platform admin's all), and
 * clear-api enforces the same rule.
 */
export function AliasesView({ canPlaceAnywhere }: { canPlaceAnywhere: boolean }) {
  const t = useTranslations("inbox");
  const format = useFormatter();
  const utils = api.useUtils();

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [source, setSource] = useState<PlaceAliasSource | null>(null);
  const query = api.placeNames.aliases.useInfiniteQuery(
    { search: debouncedSearch.trim() || undefined, source: source ?? undefined },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      refetchOnWindowFocus: false,
    },
  );
  const aliases = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.totalCount ?? 0;

  /** The form: adding (`"new"`), or editing one alias. */
  const [editing, setEditing] = useState<GqlPlaceAlias | "new" | null>(null);
  const [deleting, setDeleting] = useState<GqlPlaceAlias | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const remove = api.placeNames.deleteAlias.useMutation();

  /** An alias changed: the list follows, and so does the queue (a new alias
   * closes the rows it answers; a deleted one opens its row again). */
  const changed = () => {
    void utils.placeNames.aliases.invalidate();
    void utils.placeNames.queue.invalidate();
    void utils.placeNames.queueCount.invalidate();
  };

  function confirmDelete() {
    if (!deleting || remove.isPending) return;
    setDeleteError(null);
    remove.mutate(
      { id: deleting.id },
      {
        onSuccess: () => {
          setDeleting(null);
          changed();
        },
        onError: (err) => setDeleteError(t(aliasErrorKey(err.data?.code))),
      },
    );
  }

  const columns = [
    { label: t("aliases.columns.spelling") },
    { label: t("aliases.columns.target") },
    { label: t("aliases.columns.scope") },
    { label: t("aliases.columns.source") },
    { label: t("aliases.columns.author") },
    { label: t("aliases.columns.added") },
    { label: t("aliases.columns.actions"), width: 150 },
  ];

  return (
    <Box p={16} data-testid="inbox-aliases">
      <Group justify="space-between" align="flex-end" mb={12} wrap="wrap">
        <Group align="flex-end" gap={8}>
          <TextInput
            size="xs"
            w={260}
            leftSection={<IconSearch size={14} />}
            placeholder={t("aliases.search")}
            aria-label={t("aliases.search")}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            data-testid="inbox-aliases-search"
          />
          <Select
            size="xs"
            w={170}
            clearable
            placeholder={t("aliases.sourceAll")}
            aria-label={t("aliases.columns.source")}
            data={PLACE_ALIAS_SOURCES.map((s) => ({ value: s, label: t(`aliases.sources.${s}`) }))}
            value={source}
            onChange={(value) => setSource((value as PlaceAliasSource | null) ?? null)}
            data-testid="inbox-aliases-source"
          />
          <Text size="xs" c="var(--color-text-muted)" data-testid="inbox-aliases-count">
            {t("aliases.count", { count: total })}
          </Text>
        </Group>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setEditing("new")} data-testid="inbox-aliases-add">
          {t("aliases.add")}
        </Button>
      </Group>

      {query.error && (
        <Text size="sm" c="var(--color-critical)" role="alert" mb={8}>
          {t("aliases.loadError")}
        </Text>
      )}

      <DataTable
        columns={columns}
        data={aliases}
        loading={query.isLoading}
        emptyMessage={t(debouncedSearch.trim() || source ? "aliases.noMatch" : "aliases.empty")}
        renderRow={(alias) => (
          <Table.Tr key={alias.id} data-testid="inbox-alias-row">
            <Table.Td>
              {/* A spelling is Latin or Arabic: it takes its own direction. */}
              <bdi data-testid="inbox-alias-spelling">{alias.nameDisplay}</bdi>
              {alias.note && (
                <Text size="xs" c="var(--color-text-muted)" dir="auto">
                  {alias.note}
                </Text>
              )}
            </Table.Td>
            <Table.Td data-testid="inbox-alias-target">
              <bdi>{aliasTargetPath(alias) ?? t("aliases.targetGone")}</bdi>
              {alias.location && (
                <Text size="xs" c="var(--color-text-muted)">
                  {t(`aliases.levels.${alias.location.level === 4 ? "landmark" : alias.location.level === 2 ? "district" : "area"}`)}
                </Text>
              )}
            </Table.Td>
            <Table.Td>{alias.scopeLocation?.name ?? t("aliases.wholeCountry", { country: alias.countryCode })}</Table.Td>
            <Table.Td>{t(`aliases.sources.${alias.source}`)}</Table.Td>
            <Table.Td>{alias.createdByName ?? t("aliases.noAuthor")}</Table.Td>
            <Table.Td>{format.dateTime(new Date(alias.createdAt), { dateStyle: "medium" })}</Table.Td>
            <Table.Td>
              {alias.canEdit && (
                <Group gap={4} wrap="nowrap">
                  <Button
                    size="compact-xs"
                    variant="default"
                    leftSection={<IconPencil size={12} />}
                    onClick={() => setEditing(alias)}
                    data-testid="inbox-alias-edit"
                  >
                    {t("aliases.edit")}
                  </Button>
                  <Button
                    size="compact-xs"
                    variant="default"
                    color="red"
                    leftSection={<IconTrash size={12} />}
                    onClick={() => {
                      setDeleteError(null);
                      setDeleting(alias);
                    }}
                    data-testid="inbox-alias-delete"
                  >
                    {t("aliases.delete")}
                  </Button>
                </Group>
              )}
            </Table.Td>
          </Table.Tr>
        )}
      />

      {query.hasNextPage && (
        <Box mt={12} style={{ textAlign: "center" }}>
          <Button
            size="xs"
            variant="default"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
            data-testid="inbox-aliases-more"
          >
            {t("aliases.loadMore", { shown: aliases.length, total })}
          </Button>
        </Box>
      )}

      {editing && (
        <AliasFormModal
          alias={editing === "new" ? null : editing}
          canPlaceAnywhere={canPlaceAnywhere}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            changed();
          }}
        />
      )}

      {deleting && (
        <Modal
          opened
          onClose={() => !remove.isPending && setDeleting(null)}
          title={t("aliases.deleteTitle")}
          centered
          size="sm"
          transitionProps={{ duration: 0 }}
        >
          <Box data-testid="inbox-alias-delete-confirm">
            <Text size="sm">
              {t.rich("aliases.deleteBody", {
                name: deleting.nameDisplay,
                b: (chunks) => <bdi style={{ fontWeight: 600 }}>{chunks}</bdi>,
              })}
            </Text>
            <Text size="sm" mt={8} c="var(--color-text-secondary)">
              {t("aliases.deleteKeeps")}
            </Text>
            {deleteError && (
              <Text size="sm" c="var(--color-critical)" role="alert" mt={8}>
                {deleteError}
              </Text>
            )}
            <Group justify="flex-end" mt={16} gap={8}>
              <Button size="xs" variant="default" disabled={remove.isPending} onClick={() => setDeleting(null)}>
                {t("aliases.cancel")}
              </Button>
              <Button size="xs" color="red" loading={remove.isPending} onClick={confirmDelete} data-testid="inbox-alias-delete-yes">
                {t("aliases.deleteYes")}
              </Button>
            </Group>
          </Box>
        </Modal>
      )}
    </Box>
  );
}
