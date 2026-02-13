import type { ReactNode } from "react";
import { Box, Table, Loader } from "@mantine/core";

const TH_STYLE: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "#737373",
  fontWeight: 600,
};

interface DataTableColumn {
  label: string;
  width?: number | string;
}

interface DataTableProps<T> {
  columns: DataTableColumn[];
  data: T[];
  renderRow: (item: T, index: number) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  renderRow,
  loading,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <Box p={32} style={{ textAlign: "center" }}>
        <Loader size="sm" />
      </Box>
    );
  }

  return (
    <Table>
      <Table.Thead>
        <Table.Tr style={{ background: "#F5F5F5" }}>
          {columns.map((col) => (
            <Table.Th key={col.label} style={{ ...TH_STYLE, width: col.width }}>
              {col.label}
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.length === 0 ? (
          <Table.Tr>
            <Table.Td colSpan={columns.length}>
              <Box py={24} style={{ textAlign: "center", color: "#737373", fontSize: 13 }}>
                {emptyMessage}
              </Box>
            </Table.Td>
          </Table.Tr>
        ) : (
          data.map((item, i) => renderRow(item, i))
        )}
      </Table.Tbody>
    </Table>
  );
}

/** Re-export Table sub-components for convenience */
export { Table };
