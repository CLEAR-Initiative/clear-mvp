import { Box, Text, SimpleGrid } from "@mantine/core";
import { CardSection } from "~/components/ui";
import { scenarios } from "./analysis-data";

export function ScenariosTab() {
  return (
    <CardSection
      title="Scenario Comparison"
      subtitle="Compare projected outcomes"
    >
      <SimpleGrid cols={3} spacing={16}>
        {scenarios.map((scenario) => (
          <Box
            key={scenario.name}
            p={20}
            style={{
              border: `1px solid ${scenario.likelihoodColor}20`,
              background: `${scenario.likelihoodBg}40`,
            }}
          >
            <Text size="xl" fw={700} c={scenario.likelihoodColor} mb={8}>
              {scenario.likelihood.replace(" likely", "")}
            </Text>
            <Text fw={600} c="var(--color-text-primary)">
              {scenario.name}
            </Text>
            <Text size="xs" c="var(--color-text-secondary)" mb={12}>
              {scenario.sub}
            </Text>
            <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }}>
              {scenario.description}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </CardSection>
  );
}
