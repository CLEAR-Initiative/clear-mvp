import { useTranslations } from "next-intl";
import { Box, Text, Group, SimpleGrid, Progress, Button } from "@mantine/core";
import { CardSection, ResourceBar } from "~/components/ui";
import { budgetBreakdown, resources, humanResources } from "./operations-data";

export function ResourcesTab() {
  const t = useTranslations("operations");

  return (
    <Box>
      {/* Budget Overview */}
      <CardSection
        title={t("budget.title")}
        subtitle={t("budget.totalSubtitle")}
        style={{ marginBottom: 24 }}
      >
        {budgetBreakdown.map((item) => (
          <Box key={item.phase} mb={12}>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>{item.phase}</Text>
              <Text size="sm" fw={600} style={{ fontFamily: "monospace" }}>${item.budget.toLocaleString()} ({item.pct}%)</Text>
            </Group>
            <Progress value={item.pct} size={8} color={item.color} />
          </Box>
        ))}
      </CardSection>

      {/* Material Resources + Human Resources */}
      <SimpleGrid cols={2} spacing={16} mb={24}>
        <CardSection
          title={t("materialResources.title")}
          subtitle={t("materialResources.subtitle")}
          action={<Button size="xs" variant="outline" color="gray">{t("resourceStatus.requestResources")}</Button>}
        >
          {resources.map((res) => (
            <ResourceBar
              key={res.name}
              name={res.name}
              current={res.current}
              total={res.total}
              color={res.barColor}
              status={res.status}
              statusColor={res.statusColor}
            />
          ))}
        </CardSection>

        <CardSection
          title={t("humanResources.title")}
          subtitle={t("humanResources.subtitle")}
        >
          {humanResources.map((item) => (
            <ResourceBar
              key={item.label}
              name={item.label}
              current={item.value}
              total={item.total}
              color={item.color}
            />
          ))}
        </CardSection>
      </SimpleGrid>
    </Box>
  );
}
