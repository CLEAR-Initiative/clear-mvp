import { useTranslations } from "next-intl";
import { Box, Text, SimpleGrid } from "@mantine/core";
import { CardSection } from "~/components/ui";
import { scenarios } from "./analysis-data";

export function ScenariosTab() {
  const t = useTranslations("analysis");
  return (
    <CardSection
      title={t("scenarios.title")}
      subtitle={t("scenarios.subtitle")}
    >
      <SimpleGrid cols={3} spacing={16}>
        {scenarios.map((scenario) => (
          <Box
            key={scenario.key}
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
              {t(`data.scenarios.${scenario.key}.name`)}
            </Text>
            <Text size="xs" c="var(--color-text-secondary)" mb={12}>
              {t(`data.scenarios.${scenario.key}.sub`)}
            </Text>
            <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }}>
              {t(`data.scenarios.${scenario.key}.description`)}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </CardSection>
  );
}
