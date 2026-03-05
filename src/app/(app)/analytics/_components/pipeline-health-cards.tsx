"use client";

import { Card, Text, Stack } from "@mantine/core";
import { CardSection } from "~/components/ui/card-section";
import { pipelineHealth } from "./analytics-data";

export function PipelineHealthCards() {
  return (
    <CardSection
      title="Pipeline Health"
      subtitle="Data infrastructure performance"
    >
      <Stack gap={12}>
        {pipelineHealth.map((stat) => (
          <Card
            key={stat.label}
            p="md"
            style={{ border: "1px solid #E5E5E5", background: "#FAFAFA" }}
          >
            <Text
              c="#737373"
              fw={600}
              tt="uppercase"
              mb={4}
              style={{ fontSize: 10, letterSpacing: "0.5px" }}
            >
              {stat.label}
            </Text>
            <Text
              fw={700}
              c={stat.color ?? "#171717"}
              style={{ fontSize: 24, lineHeight: 1 }}
            >
              {stat.value}
            </Text>
            {stat.sub && (
              <Text mt={4} style={{ fontSize: 11, color: "#737373" }}>
                {stat.sub}
              </Text>
            )}
          </Card>
        ))}
      </Stack>
    </CardSection>
  );
}
