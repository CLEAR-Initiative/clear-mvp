import { Card, SimpleGrid, Text } from "@mantine/core";

export interface StatItem {
  label: string;
  value: string;
  color?: string;
  sub?: string;
  subColor?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  cols?: number;
  mb?: number;
  /** Optional style override for individual cards */
  cardStyle?: (stat: StatItem, index: number) => React.CSSProperties;
}

export function StatsGrid({ stats, cols = 4, mb = 24, cardStyle }: StatsGridProps) {
  const mobileCols = Math.min(stats.length, 3);

  return (
    <SimpleGrid
      cols={{ base: mobileCols, sm: cols }}
      spacing={{ base: 10, sm: 16 }}
      mb={mb}
    >
      {stats.map((stat, i) => (
        <Card
          key={stat.label}
          p="lg"
          style={{
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            ...cardStyle?.(stat, i),
          }}
        >
          <Text
            c="var(--color-text-muted)"
            fw={600}
            tt="uppercase"
            mb={stat.sub ? 8 : 4}
            lineClamp={2}
            style={{
              fontSize: 11,
              letterSpacing: "0.5px",
              lineHeight: 1.25,
              minHeight: 28,
            }}
          >
            {stat.label}
          </Text>
          <Text
            fw={700}
            c={stat.color ?? "#171717"}
            style={{
              fontSize: 28,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {stat.value}
          </Text>
          {stat.sub && (
            <Text mt={8} style={{ fontSize: 11, color: stat.subColor ?? "#737373" }}>
              {stat.sub}
            </Text>
          )}
        </Card>
      ))}
    </SimpleGrid>
  );
}
