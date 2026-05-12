import Link from "next/link";
import { PageHeader } from "~/components/ui";
import { Box, Text } from "@mantine/core";
import { IconArrowRight, IconChartBar } from "@tabler/icons-react";

const TOOLS = [
  {
    href: "/tools/modality-choice",
    icon: IconChartBar,
    iconColor: "#E85D3D",
    iconBg: "#FFF4EF",
    title: "Modality Choice Tool",
    description:
      "A structured 7-criterion assessment to identify the most appropriate assistance modality — in-kind, cash, vouchers, services, or facilitation — for a given programme context.",
  },
];

export default function ToolsPage() {
  return (
    <Box>
      <PageHeader title="Tools" subtitle="Tools" breadcrumbs={["CLEAR", "Tools"]} />
      <Box px={24} pt={20} pb={32}>
        <Box style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href} style={{ textDecoration: "none", display: "block", width: 320 }}>
                <Box
                  style={{
                    border: "1px solid #E5E5E5",
                    borderRadius: 8,
                    background: "#FFF",
                    padding: 20,
                    cursor: "pointer",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  className="hover:border-[#E85D3D] hover:shadow-sm"
                >
                  <Box
                    mb={14}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: tool.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={20} color={tool.iconColor} />
                  </Box>
                  <Text fw={600} c="#171717" style={{ fontSize: 14, marginBottom: 6 }}>
                    {tool.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#737373", lineHeight: 1.6, marginBottom: 14 }}>
                    {tool.description}
                  </Text>
                  <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: 12, color: "#E85D3D", fontWeight: 600 }}>Open tool</Text>
                    <IconArrowRight size={12} color="#E85D3D" />
                  </Box>
                </Box>
              </Link>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
