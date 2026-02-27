import { Text, Button } from "@mantine/core";
import { CardSection, DataTable, Table, StatusIndicator } from "~/components/ui";
import { partners } from "./operations-data";

export function CoordinationTab() {
  return (
    <CardSection
      title="Coordination Partners"
      subtitle="Organizations in the response"
      action={<Button size="xs" variant="outline" color="gray">+ Add Partner</Button>}
      noPadding
    >
      <DataTable
        columns={[
          { label: "Organization" },
          { label: "Role" },
          { label: "Coverage Area" },
          { label: "Contact" },
          { label: "Status" },
        ]}
        data={partners}
        renderRow={(p) => (
          <Table.Tr key={p.org}>
            <Table.Td><Text fw={600} style={{ fontSize: 13 }}>{p.org}</Text></Table.Td>
            <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{p.role}</Text></Table.Td>
            <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{p.coverage}</Text></Table.Td>
            <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{p.contact}</Text></Table.Td>
            <Table.Td>
              <StatusIndicator status={p.status} color={p.statusColor} />
            </Table.Td>
          </Table.Tr>
        )}
      />
    </CardSection>
  );
}
