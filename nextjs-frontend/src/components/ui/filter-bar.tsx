import { Group, Select, Text } from "@mantine/core";

const LABEL_STYLE = {
  fontSize: 10,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const INPUT_STYLE = {
  fontWeight: 600,
  fontSize: 13,
  border: "1px solid #E5E5E5",
};

function FilterLabel({ children }: { children: string }) {
  return (
    <Text size="xs" c="#737373" tt="uppercase" style={LABEL_STYLE}>
      {children}
    </Text>
  );
}

interface FilterBarProps {
  country: string;
  onCountryChange: (value: string) => void;
  region: string;
  onRegionChange: (value: string) => void;
  countries: string[];
  regions: string[];
  date?: string;
  onDateChange?: (value: string) => void;
  dateOptions?: string[];
}

export function FilterBar({
  country,
  onCountryChange,
  region,
  onRegionChange,
  countries,
  regions,
  date,
  onDateChange,
  dateOptions,
}: FilterBarProps) {
  return (
    <Group gap={12}>
      <Select
        size="xs"
        value={country}
        onChange={(v) => onCountryChange(v ?? country)}
        data={countries}
        style={{ minWidth: 130 }}
        styles={{ input: INPUT_STYLE }}
        label={<FilterLabel>Country</FilterLabel>}
      />
      <Select
        size="xs"
        value={region}
        onChange={(v) => onRegionChange(v ?? "All Regions")}
        data={regions}
        style={{ minWidth: 130 }}
        styles={{ input: INPUT_STYLE }}
        label={<FilterLabel>Region</FilterLabel>}
      />
      {date != null && onDateChange && dateOptions && (
        <Select
          size="xs"
          value={date}
          onChange={(v) => onDateChange(v ?? date)}
          data={dateOptions}
          style={{ minWidth: 120 }}
          styles={{ input: INPUT_STYLE }}
          label={<FilterLabel>Date</FilterLabel>}
        />
      )}
    </Group>
  );
}
