import { Text, Group } from "@mantine/core";
import { IconFile } from "@tabler/icons-react";
import { CardSection, DataTable, Table } from "~/components/ui";
import { type Document, getTypeColor } from "./knowledge-data";

interface DocumentLibraryProps {
  filteredDocuments: Document[];
}

const columns = [
  { label: "Document" },
  { label: "Type", width: 90 },
  { label: "Sector", width: 90 },
  { label: "Updated", width: 80 },
  { label: "", width: 50 },
];

export function DocumentLibrary({ filteredDocuments }: DocumentLibraryProps) {
  return (
    <CardSection
      title="Document Library"
      subtitle={`${filteredDocuments.length} documents found`}
      noPadding
    >
      <DataTable
        columns={columns}
        data={filteredDocuments}
        emptyMessage="No documents found matching your filters"
        renderRow={(doc) => {
          const tc = getTypeColor(doc.type);
          return (
            <Table.Tr key={doc.id}>
              <Table.Td>
                <Group gap={8}>
                  <IconFile size={16} color={doc.iconColor} />
                  <Text fw={500} style={{ fontSize: 13 }}>{doc.title}</Text>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text px={6} py={2} style={{ background: tc.bg, color: tc.color, display: "inline-block", fontSize: 11 }}>
                  {doc.type}
                </Text>
              </Table.Td>
              <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{doc.sector}</Text></Table.Td>
              <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{doc.updated}</Text></Table.Td>
              <Table.Td>
                <Text c="#2563EB" style={{ cursor: "pointer", fontSize: 12 }}>Download</Text>
              </Table.Td>
            </Table.Tr>
          );
        }}
      />
    </CardSection>
  );
}
