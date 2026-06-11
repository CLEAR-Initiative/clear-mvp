import { useTranslations } from "next-intl";
import { Text, Button } from "@mantine/core";
import { CardSection, DataTable, Table, StatusIndicator } from "~/components/ui";
import { partners } from "./operations-data";

export function CoordinationTab() {
  const t = useTranslations("operations.coordination");

  return (
    <CardSection
      title={t("title")}
      subtitle={t("subtitle")}
      action={<Button size="xs" variant="outline" color="gray">{t("addPartner")}</Button>}
      noPadding
    >
      <DataTable
        columns={[
          { label: t("columns.organization") },
          { label: t("columns.role") },
          { label: t("columns.coverage") },
          { label: t("columns.contact") },
          { label: t("columns.status") },
        ]}
        data={partners}
        renderRow={(p) => (
          <Table.Tr key={p.org}>
            <Table.Td><Text fw={600} style={{ fontSize: 13 }}>{p.org}</Text></Table.Td>
            <Table.Td><Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>{p.role}</Text></Table.Td>
            <Table.Td><Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>{p.coverage}</Text></Table.Td>
            <Table.Td><Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>{p.contact}</Text></Table.Td>
            <Table.Td>
              <StatusIndicator status={p.status} color={p.statusColor} />
            </Table.Td>
          </Table.Tr>
        )}
      />
    </CardSection>
  );
}
