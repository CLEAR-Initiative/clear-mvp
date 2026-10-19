"use client";

import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  CopyButton,
  Group,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import {
  IconCheck,
  IconCopy,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

const SEVERITY_OPTIONS = ["1", "2", "3", "4", "5"];

/** Split a comma / whitespace separated filter input into glide/event codes. */
function parseFilter(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Team settings "Webhooks" section: lists the team's outbound alert webhooks
 * and lets a team admin add / disable / delete / rotate them. Rendered only
 * when `canManage` is true (the page's team-admin gate); clear-api enforces
 * the real gate on every mutation regardless.
 */
export function WebhooksSection({
  teamId,
  canManage,
}: {
  teamId: string;
  canManage: boolean;
}) {
  const t = useTranslations("settings.team.webhooks");
  const tCommon = useTranslations("common.actions");
  const utils = api.useUtils();

  const listQuery = api.teams.alertWebhooks.list.useQuery(
    { teamId },
    { enabled: canManage },
  );
  const createWebhook = api.teams.alertWebhooks.create.useMutation();
  const updateWebhook = api.teams.alertWebhooks.update.useMutation();
  const deleteWebhook = api.teams.alertWebhooks.delete.useMutation();
  const rotateSecret = api.teams.alertWebhooks.rotateSecret.useMutation();

  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [filterInput, setFilterInput] = useState("");
  const [minSeverity, setMinSeverity] = useState<string | null>(null);
  // The signing secret from the most recent create / rotate, shown once — kept
  // WITH its webhook name so two creates/rotates can't leave an ambiguous reveal.
  const [revealedSecret, setRevealedSecret] = useState<{ name: string; secret: string } | null>(
    null,
  );

  // Hide dead UI from non-admins; clear-api is still the real gate.
  if (!canManage) return null;

  const webhooks = listQuery.data ?? [];
  const createError = createWebhook.error;
  // Surface failures from the non-create actions too, so a failed
  // enable/disable, delete, or rotate isn't silent.
  const actionError = updateWebhook.error ?? deleteWebhook.error ?? rotateSecret.error;

  function invalidate() {
    void utils.teams.alertWebhooks.list.invalidate({ teamId });
  }

  async function handleCreate() {
    if (!name.trim() || !targetUrl.trim()) return;
    const codes = parseFilter(filterInput);
    const created = await createWebhook.mutateAsync({
      teamId,
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      alertTypeFilter: codes.length ? codes : undefined,
      minSeverity: minSeverity ? Number(minSeverity) : undefined,
    });
    setName("");
    setTargetUrl("");
    setFilterInput("");
    setMinSeverity(null);
    if (created.secret) setRevealedSecret({ name: created.name, secret: created.secret });
    invalidate();
  }

  async function handleToggleActive(id: string, active: boolean) {
    await updateWebhook.mutateAsync({ id, active });
    invalidate();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await deleteWebhook.mutateAsync({ id });
    invalidate();
  }

  async function handleRotate(id: string) {
    if (!confirm(t("rotateConfirm"))) return;
    const rotated = await rotateSecret.mutateAsync({ id });
    if (rotated.secret) setRevealedSecret({ name: rotated.name, secret: rotated.secret });
    invalidate();
  }

  return (
    <Box data-testid="team-webhooks-section">
      <Title order={4} mb="xs">
        {t("title")}
      </Title>
      <Text size="sm" c="dimmed" mb="sm">
        {t("description")}
      </Text>

      {revealedSecret && (
        <Alert
          color="yellow"
          mb="sm"
          withCloseButton
          onClose={() => setRevealedSecret(null)}
          title={`${t("secret.title")} — ${revealedSecret.name}`}
          data-testid="team-webhooks-secret"
        >
          <Text size="sm" mb="xs">
            {t("secret.note")}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              readOnly
              value={revealedSecret.secret}
              style={{ flex: 1 }}
              data-testid="team-webhooks-secret-value"
            />
            <CopyButton value={revealedSecret.secret}>
              {({ copied, copy }) => (
                <Button
                  size="xs"
                  variant="light"
                  color={copied ? "teal" : "blue"}
                  onClick={copy}
                  leftSection={
                    copied ? <IconCheck size={14} /> : <IconCopy size={14} />
                  }
                  data-testid="team-webhooks-secret-copy"
                >
                  {copied ? tCommon("copied") : tCommon("copy")}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Alert>
      )}

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("columns.name")}</Table.Th>
            <Table.Th>{t("columns.targetUrl")}</Table.Th>
            <Table.Th>{t("columns.filters")}</Table.Th>
            <Table.Th>{t("columns.active")}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {listQuery.isLoading ? (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text size="sm" c="dimmed" data-testid="team-webhooks-loading">
                  {t("loading")}
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : listQuery.isError ? (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Group gap="xs">
                  <Text size="sm" c="red" data-testid="team-webhooks-load-error">
                    {t("loadError")}
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => void listQuery.refetch()}
                    data-testid="team-webhooks-retry"
                  >
                    {t("retry")}
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ) : webhooks.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text size="sm" c="dimmed">
                  {t("none")}
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            webhooks.map((w) => (
              <Table.Tr key={w.id} data-testid="team-webhooks-row">
                <Table.Td>{w.name}</Table.Td>
                <Table.Td>
                  <Text size="sm" style={{ wordBreak: "break-all" }}>
                    {w.targetUrl}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {w.alertTypeFilter.length > 0 ? (
                      w.alertTypeFilter.map((code) => (
                        <Badge key={code} variant="light" size="sm">
                          {code}
                        </Badge>
                      ))
                    ) : (
                      <Text size="sm" c="dimmed">
                        {t("filters.all")}
                      </Text>
                    )}
                    {w.minSeverity != null && (
                      <Badge variant="outline" size="sm" color="orange">
                        {t("filters.minSeverity", { level: w.minSeverity })}
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Switch
                    checked={w.active}
                    onChange={(e) =>
                      handleToggleActive(w.id, e.currentTarget.checked)
                    }
                    aria-label={t("toggleActive")}
                    data-testid="team-webhooks-active"
                  />
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <Tooltip label={t("rotate")}>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => handleRotate(w.id)}
                        loading={rotateSecret.isPending}
                        data-testid="team-webhooks-rotate"
                        aria-label={t("rotate")}
                      >
                        <IconRefresh size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={tCommon("delete")}>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(w.id)}
                        loading={deleteWebhook.isPending}
                        data-testid="team-webhooks-delete"
                        aria-label={tCommon("delete")}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {createError && (
        <Text size="sm" c="red" mt="xs" data-testid="team-webhooks-error">
          {createError.message}
        </Text>
      )}

      {actionError && (
        <Text size="sm" c="red" mt="xs" data-testid="team-webhooks-action-error">
          {actionError.message}
        </Text>
      )}

      <Stack gap="sm" mt="md" data-testid="team-webhooks-add">
        <Title order={6}>{t("add.title")}</Title>
        <Group gap="sm" align="flex-end" wrap="wrap">
          <TextInput
            label={t("add.nameLabel")}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            size="xs"
            w={200}
            data-testid="team-webhooks-name"
          />
          <TextInput
            label={t("add.targetUrlLabel")}
            placeholder="https://"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.currentTarget.value)}
            size="xs"
            w={280}
            data-testid="team-webhooks-url"
          />
          <TextInput
            label={t("add.filterLabel")}
            placeholder={t("add.filterPlaceholder")}
            value={filterInput}
            onChange={(e) => setFilterInput(e.currentTarget.value)}
            size="xs"
            w={220}
            data-testid="team-webhooks-filter"
          />
          <Select
            label={t("add.minSeverityLabel")}
            placeholder={t("add.minSeverityPlaceholder")}
            data={SEVERITY_OPTIONS}
            value={minSeverity}
            onChange={setMinSeverity}
            clearable
            size="xs"
            w={140}
            data-testid="team-webhooks-severity"
          />
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={handleCreate}
            loading={createWebhook.isPending}
            disabled={!name.trim() || !targetUrl.trim()}
            data-testid="team-webhooks-submit"
          >
            {t("add.submit")}
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}
