import { Box, Text, SimpleGrid } from "@mantine/core";
import { IconFile } from "@tabler/icons-react";
import { CardSection } from "~/components/ui";
import { type ActiveCrisis, getTypeColor } from "./knowledge-data";

interface CrisisResourcesProps {
  filteredCrises: ActiveCrisis[];
}

export function CrisisResources({ filteredCrises }: CrisisResourcesProps) {
  if (filteredCrises.length === 0) return null;

  return (
    <CardSection
      title="Active Crisis Resources"
      subtitle={`${filteredCrises.length} active ${filteredCrises.length === 1 ? "crisis" : "crises"} in selected location`}
      noPadding
    >
      {filteredCrises.map((crisis, i) => (
        <Box key={crisis.id} px={16} py={16} className={i < filteredCrises.length - 1 ? "border-b border-[var(--color-border)]" : ""}>
          <Box style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Box style={{ width: 8, height: 8, background: crisis.severity === "high" ? "#DC2626" : "#D97706" }} />
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>{crisis.name}</Text>
            <Text size="xs" c="var(--color-text-muted)">• {crisis.location}</Text>
          </Box>
          <SimpleGrid cols={4} spacing={8}>
            {crisis.resources.map((resource, idx) => (
              <Box
                key={idx}
                p={8}
                style={{ background: "var(--color-bg-muted)", display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}
                className="hover:bg-[#F0F0F0]"
              >
                <IconFile size={16} color={resource.priority ? "#E85D3D" : "#A3A3A3"} style={{ flexShrink: 0, marginTop: 2 }} />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={500} style={{ fontSize: 12 }} lineClamp={2}>{resource.title}</Text>
                  <Text px={4} py={1} mt={4} style={{ ...getTypeColor(resource.type), display: "inline-block", fontSize: 10 }}>
                    {resource.type}
                  </Text>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </CardSection>
  );
}
