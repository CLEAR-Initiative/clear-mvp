"use client";

import { useState } from "react";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Button,
  SimpleGrid,
  Table,
  Tabs,
  Progress,
} from "@mantine/core";
import {
  IconUsers,
  IconCircleCheck,
  IconPointFilled,
  IconAlertTriangle,
  IconShield,
  IconBuildingSkyscraper,
} from "@tabler/icons-react";

const stats = [
  { label: "Active Operations", value: "2", color: "#2563EB" },
  { label: "Field Teams Deployed", value: "12", color: undefined },
  { label: "Staff Mobilized", value: "67", color: undefined },
  { label: "Partner Orgs", value: "8", color: undefined },
];

const operations = [
  {
    name: "Cholera Response - Somali Region",
    severity: "Critical",
    severityColor: "#DC2626",
    severityBg: "#FEE2E2",
    barColor: "#DC2626",
    activated: "2 hours ago",
    opId: "ETH-2025-CHO-001",
    teams: "8 deployed",
    staff: "42 mobilized",
    coverage: "3 woredas",
    budget: "$245,000",
    tags: [
      { label: "WASH", bg: "#DBEAFE", color: "#2563EB" },
      { label: "Health", bg: "#D1FAE5", color: "#059669" },
      { label: "Logistics", bg: "#FEF3C7", color: "#D97706" },
      { label: "Community Engagement", bg: "#F3E8FF", color: "#7C3AED" },
    ],
  },
  {
    name: "Flood Preparedness - Oromia Region",
    severity: "High",
    severityColor: "#F59E0B",
    severityBg: "#FEF3C7",
    barColor: "#F59E0B",
    activated: "6 hours ago",
    opId: "ETH-2025-FLD-002",
    teams: "4 deployed",
    staff: "25 mobilized",
    coverage: "2 woredas",
    budget: "$120,000",
    tags: [
      { label: "Pre-positioning", bg: "#FEF3C7", color: "#D97706" },
      { label: "Shelter", bg: "#DBEAFE", color: "#2563EB" },
      { label: "Early Warning", bg: "#D1FAE5", color: "#059669" },
    ],
  },
];

const fieldTeams = [
  { name: "WASH Team Alpha", members: "6 members", location: "Jijiga", status: "Active", statusColor: "#059669", lastCheckin: "15 min ago" },
  { name: "Health Team Bravo", members: "5 members", location: "Kebridehar", status: "Active", statusColor: "#059669", lastCheckin: "30 min ago" },
  { name: "Assessment Team", members: "4 members", location: "Gode", status: "En Route", statusColor: "#D97706", lastCheckin: "1h ago" },
  { name: "Logistics Support", members: "3 members", location: "Dire Dawa Hub", status: "Active", statusColor: "#059669", lastCheckin: "45 min ago" },
  { name: "Community Liaison", members: "4 members", location: "Jijiga", status: "Active", statusColor: "#059669", lastCheckin: "20 min ago" },
];

const resources = [
  { name: "ORS Sachets", status: "Good stock", statusColor: "#059669", current: 15600, total: 20000, barColor: "#059669" },
  { name: "IV Fluids (Ringer's)", status: "Low stock", statusColor: "#D97706", current: 640, total: 2000, barColor: "#D97706" },
  { name: "Water Purification Tablets", status: "Good stock", statusColor: "#059669", current: 42500, total: 50000, barColor: "#059669" },
  { name: "Hygiene Kits", status: "Critical", statusColor: "#DC2626", current: 540, total: 3000, barColor: "#DC2626" },
  { name: "Vehicles Available", status: "Adequate", statusColor: "#059669", current: 8, total: 12, barColor: "#059669" },
];

const partners = [
  { org: "NRC Ethiopia", role: "Lead Agency", coverage: "Jijiga, Kebridehar, Gode", contact: "Melese A. (Program Manager)", status: "Active", statusColor: "#059669" },
  { org: "WHO Ethiopia", role: "Health Coordination", coverage: "Regional support", contact: "Dr. Sarah M.", status: "Active", statusColor: "#059669" },
  { org: "UNICEF", role: "WASH Support", coverage: "Jijiga, Kebridehar", contact: "Ahmed H.", status: "Active", statusColor: "#059669" },
  { org: "WFP", role: "Logistics", coverage: "Regional hub", contact: "Maria L.", status: "Standby", statusColor: "#D97706" },
  { org: "Ethiopian Red Cross", role: "Community Mobilization", coverage: "Jijiga", contact: "Dawit T.", status: "Active", statusColor: "#059669" },
];

// NRC Capacity data
const nrcCapacity = {
  totalStaff: 450,
  national: 380,
  international: 70,
  offices: 5,
  established: "2011",
  activePrograms: 8,
};

// Phased Response Strategy
const responsePhases = [
  {
    name: "Phase 1: Emergency",
    color: "#DC2626",
    colorBg: "#FEE2E2",
    duration: "Day 1-7",
    budget: "$120,000",
    activities: [
      "Deploy WASH rapid response teams to affected areas",
      "Establish oral rehydration points at 6 health facilities",
      "Begin water quality testing at all community water sources",
      "Activate community health worker surveillance network",
      "Pre-position cholera treatment supplies at regional hub",
    ],
  },
  {
    name: "Phase 2: Scale-Up",
    color: "#F59E0B",
    colorBg: "#FEF3C7",
    duration: "Week 2-4",
    budget: "$280,000",
    activities: [
      "Scale WASH coverage to all affected woredas",
      "Establish 3 cholera treatment centers",
      "Distribute hygiene kits to 5,000 households",
      "Launch community-based health education campaign",
      "Coordinate with government on water system rehabilitation",
    ],
  },
  {
    name: "Phase 3: Stabilization",
    color: "#059669",
    colorBg: "#D1FAE5",
    duration: "Month 2-3",
    budget: "$165,000",
    activities: [
      "Transition from emergency to sustained WASH programming",
      "Rehabilitation of damaged water infrastructure",
      "Community-based surveillance handover",
      "Monitoring and evaluation of response effectiveness",
    ],
  },
];

// Implementation Timeline
const timeline = [
  { day: "Day 1", milestone: "Emergency activation and team deployment", color: "#DC2626" },
  { day: "Day 2-3", milestone: "Initial assessment and water testing completed", color: "#DC2626" },
  { day: "Day 4-5", milestone: "ORP and treatment supplies in place", color: "#DC2626" },
  { day: "Day 7", milestone: "Phase 1 objectives met, scale-up begins", color: "#F59E0B" },
  { day: "Week 2", milestone: "Cholera treatment centers operational", color: "#F59E0B" },
  { day: "Week 3", milestone: "Full WASH coverage in affected areas", color: "#F59E0B" },
  { day: "Month 2", milestone: "Transition to stabilization phase", color: "#059669" },
];

// Risk Assessment
const riskAssessment = [
  { risk: "Supply Chain Disruption", severity: "High", severityColor: "#F59E0B", severityBg: "#FEF3C7", description: "Road access compromised during rainy season", mitigation: "Pre-position supplies; establish alternative routes via Dire Dawa" },
  { risk: "Community Resistance", severity: "Medium", severityColor: "#D97706", severityBg: "#FEF3C7", description: "Mistrust of water treatment methods in some communities", mitigation: "Engage community leaders; conduct awareness campaigns" },
  { risk: "Security Deterioration", severity: "High", severityColor: "#F59E0B", severityBg: "#FEF3C7", description: "Inter-communal tensions in displacement sites", mitigation: "Coordinate with local authorities; establish safe access protocols" },
  { risk: "Funding Gaps", severity: "Critical", severityColor: "#DC2626", severityBg: "#FEE2E2", description: "Only 60% of required funding secured", mitigation: "Activate rapid funding mechanisms; reprioritize existing budgets" },
];

// Budget breakdown
const budgetBreakdown = [
  { phase: "Phase 1: Emergency", budget: 120000, pct: 21, color: "#DC2626" },
  { phase: "Phase 2: Scale-Up", budget: 280000, pct: 50, color: "#F59E0B" },
  { phase: "Phase 3: Stabilization", budget: 165000, pct: 29, color: "#059669" },
];

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("active");
  return (
    <Box>
      {/* Header */}
      <Box px={24} py={12} className="border-b border-[#E5E5E5]" style={{ background: "#FFFFFF" }}>
        <Group justify="space-between">
          <Text fw={600} c="#171717" style={{ fontSize: 16 }}>Operations Center</Text>
          <Group gap={8}>
            <Button variant="outline" color="gray" size="xs" leftSection={<IconUsers size={14} />} style={{ fontSize: 13 }}>
              Team Directory
            </Button>
            <Button size="xs" leftSection={<IconCircleCheck size={14} />} style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}>
              Activate Response
            </Button>
          </Group>
        </Group>
      </Box>

      <Box p={24}>
        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab} mb={24} styles={{ tab: { fontSize: 13, fontWeight: 500 } }}>
          <Tabs.List>
            <Tabs.Tab value="active">Active Operations</Tabs.Tab>
            <Tabs.Tab value="strategy">Response Strategy</Tabs.Tab>
            <Tabs.Tab value="resources">Resources & Budget</Tabs.Tab>
            <Tabs.Tab value="coordination">Coordination</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* Stats */}
        <SimpleGrid cols={4} spacing={16} mb={24}>
          {stats.map((stat) => (
            <Card key={stat.label} p="lg" style={{ border: "1px solid #E5E5E5" }}>
              <Text c="#737373" fw={600} tt="uppercase" mb={4} style={{ fontSize: 11, letterSpacing: "0.5px" }}>{stat.label}</Text>
              <Text fw={700} c={stat.color ?? "#171717"} style={{ fontSize: 28 }}>{stat.value}</Text>
            </Card>
          ))}
        </SimpleGrid>

        {/* ========== Active Operations Tab ========== */}
        {activeTab === "active" && (
          <Box>
            {/* NRC Capacity Card */}
            <SimpleGrid cols={2} spacing={16} mb={24}>
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                  <Group gap={8}>
                    <IconBuildingSkyscraper size={16} color="#2563EB" />
                    <Text fw={600} c="#171717" style={{ fontSize: 14 }}>NRC Ethiopia Capacity</Text>
                  </Group>
                  <Text size="xs" c="#737373">Established {nrcCapacity.established}</Text>
                </Box>
                <Box p={16}>
                  <SimpleGrid cols={3} spacing={12} mb={12}>
                    <Box p={10} style={{ background: "#F5F5F5", textAlign: "center" }}>
                      <Text size="lg" fw={700} c="#171717">{nrcCapacity.totalStaff}</Text>
                      <Text size="xs" c="#737373">Total Staff</Text>
                    </Box>
                    <Box p={10} style={{ background: "#F5F5F5", textAlign: "center" }}>
                      <Text size="lg" fw={700} c="#171717">{nrcCapacity.national}</Text>
                      <Text size="xs" c="#737373">National</Text>
                    </Box>
                    <Box p={10} style={{ background: "#F5F5F5", textAlign: "center" }}>
                      <Text size="lg" fw={700} c="#171717">{nrcCapacity.international}</Text>
                      <Text size="xs" c="#737373">International</Text>
                    </Box>
                  </SimpleGrid>
                  <Group gap={16}>
                    <Box>
                      <Text size="xs" c="#737373">Offices</Text>
                      <Text fw={600}>{nrcCapacity.offices}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="#737373">Active Programs</Text>
                      <Text fw={600}>{nrcCapacity.activePrograms}</Text>
                    </Box>
                  </Group>
                </Box>
              </Card>

              {/* Comparative Advantage */}
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>NRC Comparative Advantage</Text>
                  <Text size="xs" c="#737373">Core competencies in Ethiopia</Text>
                </Box>
                <Box p={16} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "WASH Emergency Response", desc: "Rapid deployment WASH teams with cholera response experience" },
                    { label: "ICLA (Legal Assistance)", desc: "Housing, land and property rights for displaced populations" },
                    { label: "Education in Emergencies", desc: "Temporary learning spaces and teacher training programs" },
                    { label: "Camp Management", desc: "IDP site coordination and community governance support" },
                  ].map((item) => (
                    <Box key={item.label} p={10} style={{ background: "#F5F5F5" }}>
                      <Text size="sm" fw={600} c="#171717" mb={2}>{item.label}</Text>
                      <Text size="xs" c="#737373">{item.desc}</Text>
                    </Box>
                  ))}
                </Box>
              </Card>
            </SimpleGrid>

            {/* Active Operations */}
            <Card p={0} mb={24} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Active Response Operations</Text>
                <Text size="xs" c="#737373">Currently mobilized responses</Text>
              </Box>
              {operations.map((op, i) => (
                <Box key={op.opId} px={20} py={20} className={i < operations.length - 1 ? "border-b border-[#E5E5E5]" : ""}>
                  <Group gap={16} align="flex-start">
                    <Box style={{ width: 4, background: op.barColor, alignSelf: "stretch" }} />
                    <Box style={{ flex: 1 }}>
                      <Group justify="space-between" mb={12}>
                        <Box>
                          <Group gap={8}>
                            <Text fw={600} c="#171717">{op.name}</Text>
                            <Badge size="xs" style={{ background: op.severityBg, color: op.severityColor }}>{op.severity}</Badge>
                          </Group>
                          <Text size="xs" c="#A3A3A3" mt={4}>Activated {op.activated} {"\u2022"} Operation ID: {op.opId}</Text>
                        </Box>
                        <Button size="xs" variant="light" color={op.severity === "Critical" ? "red" : "gray"}>View Details</Button>
                      </Group>
                      <SimpleGrid cols={4} spacing={16} mb={16}>
                        {[
                          { label: "Teams", value: op.teams },
                          { label: "Staff", value: op.staff },
                          { label: "Coverage", value: op.coverage },
                          { label: "Budget", value: op.budget },
                        ].map((item) => (
                          <Box key={item.label}>
                            <Text size="xs" c="#A3A3A3" tt="uppercase">{item.label}</Text>
                            <Text fw={600} c="#171717">{item.value}</Text>
                          </Box>
                        ))}
                      </SimpleGrid>
                      <Group gap={8}>
                        {op.tags.map((tag) => (
                          <Text key={tag.label} size="xs" px={8} py={4} style={{ background: tag.bg, color: tag.color }}>
                            {tag.label}
                          </Text>
                        ))}
                      </Group>
                    </Box>
                  </Group>
                </Box>
              ))}
            </Card>

            {/* Field Teams + Resource Status */}
            <SimpleGrid cols={2} spacing={16}>
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                  <Group justify="space-between">
                    <Box>
                      <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Field Teams</Text>
                      <Text size="xs" c="#737373">Currently deployed</Text>
                    </Box>
                    <Button size="xs" variant="outline" color="gray">+ Deploy Team</Button>
                  </Group>
                </Box>
                <Table>
                  <Table.Thead>
                    <Table.Tr style={{ background: "#F5F5F5" }}>
                      <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Team</Table.Th>
                      <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Location</Table.Th>
                      <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Status</Table.Th>
                      <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Last Check-in</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {fieldTeams.map((team) => (
                      <Table.Tr key={team.name}>
                        <Table.Td>
                          <Text fw={500} style={{ fontSize: 13 }}>{team.name}</Text>
                          <Text c="#A3A3A3" style={{ fontSize: 12 }}>{team.members}</Text>
                        </Table.Td>
                        <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{team.location}</Text></Table.Td>
                        <Table.Td>
                          <Group gap={6}>
                            <IconPointFilled size={10} color={team.statusColor} />
                            <Text c="#525252" style={{ fontSize: 13 }}>{team.status}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{team.lastCheckin}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>

              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                  <Group justify="space-between">
                    <Box>
                      <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Resource Status</Text>
                      <Text size="xs" c="#737373">Critical supplies</Text>
                    </Box>
                    <Button size="xs" variant="outline" color="gray">Request Resources</Button>
                  </Group>
                </Box>
                <Box p={16}>
                  {resources.map((res, i) => (
                    <Box key={res.name} py={12} className={i < resources.length - 1 ? "border-b border-[#E5E5E5]" : ""}>
                      <Group justify="space-between" mb={8}>
                        <Text fw={500} size="sm">{res.name}</Text>
                        <Text size="xs" c={res.statusColor}>{res.status}</Text>
                      </Group>
                      <Group gap={8}>
                        <Progress value={(res.current / res.total) * 100} size={6} color={res.barColor} style={{ flex: 1 }} />
                        <Text size="xs" c="#A3A3A3">{res.current.toLocaleString()} / {res.total.toLocaleString()}</Text>
                      </Group>
                    </Box>
                  ))}
                </Box>
              </Card>
            </SimpleGrid>
          </Box>
        )}

        {/* ========== Response Strategy Tab (NEW) ========== */}
        {activeTab === "strategy" && (
          <Box>
            {/* Phased Response */}
            <Card p={0} mb={24} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Phased Response Strategy</Text>
                <Text size="xs" c="#737373">Cholera Outbreak Response - Somali Region</Text>
              </Box>
              <Box p={16}>
                {responsePhases.map((phase) => (
                  <Box key={phase.name} mb={20} p={16} style={{ border: `1px solid ${phase.color}30`, borderLeft: `4px solid ${phase.color}`, background: `${phase.colorBg}30` }}>
                    <Group justify="space-between" mb={12}>
                      <Box>
                        <Text fw={600} c="#171717">{phase.name}</Text>
                        <Text size="xs" c="#737373">{phase.duration}</Text>
                      </Box>
                      <Text fw={600} c={phase.color} style={{ fontFamily: "monospace" }}>{phase.budget}</Text>
                    </Group>
                    <Box style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {phase.activities.map((activity, idx) => (
                        <Group key={idx} gap={8} align="flex-start" wrap="nowrap">
                          <IconCircleCheck size={14} color={phase.color} style={{ marginTop: 2, flexShrink: 0 }} />
                          <Text size="sm" c="#525252">{activity}</Text>
                        </Group>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Card>

            {/* Implementation Timeline */}
            <Card p={0} mb={24} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Implementation Timeline</Text>
                <Text size="xs" c="#737373">Key milestones</Text>
              </Box>
              <Box p={16} pl={32} style={{ position: "relative" }}>
                <Box style={{ position: "absolute", left: 28, top: 16, bottom: 16, width: 2, background: "#E5E5E5" }} />
                {timeline.map((item, idx) => (
                  <Group key={idx} gap={16} mb={16} style={{ position: "relative" }}>
                    <Box style={{ width: 10, height: 10, background: item.color, borderRadius: "50%", flexShrink: 0, zIndex: 1 }} />
                    <Box style={{ flex: 1 }}>
                      <Text size="xs" fw={600} c={item.color}>{item.day}</Text>
                      <Text size="sm" c="#525252">{item.milestone}</Text>
                    </Box>
                  </Group>
                ))}
              </Box>
            </Card>

            {/* Risk Assessment */}
            <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Group gap={8}>
                  <IconAlertTriangle size={16} color="#F59E0B" />
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Risk Assessment</Text>
                </Group>
                <Text size="xs" c="#737373">Identified risks and mitigations</Text>
              </Box>
              <Table>
                <Table.Thead>
                  <Table.Tr style={{ background: "#F5F5F5" }}>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Risk</Table.Th>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Severity</Table.Th>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Description</Table.Th>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Mitigation</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {riskAssessment.map((r) => (
                    <Table.Tr key={r.risk}>
                      <Table.Td><Text fw={600} style={{ fontSize: 13 }}>{r.risk}</Text></Table.Td>
                      <Table.Td>
                        <Badge size="xs" style={{ background: r.severityBg, color: r.severityColor, textTransform: "uppercase" }}>{r.severity}</Badge>
                      </Table.Td>
                      <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{r.description}</Text></Table.Td>
                      <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{r.mitigation}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Box>
        )}

        {/* ========== Resources & Budget Tab (NEW) ========== */}
        {activeTab === "resources" && (
          <Box>
            {/* Budget Overview */}
            <Card p={0} mb={24} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Budget Overview</Text>
                <Text size="xs" c="#737373">Total: $565,000</Text>
              </Box>
              <Box p={16}>
                {budgetBreakdown.map((item) => (
                  <Box key={item.phase} mb={12}>
                    <Group justify="space-between" mb={4}>
                      <Text size="sm" fw={500}>{item.phase}</Text>
                      <Text size="sm" fw={600} style={{ fontFamily: "monospace" }}>${item.budget.toLocaleString()} ({item.pct}%)</Text>
                    </Group>
                    <Progress value={item.pct} size={8} color={item.color} />
                  </Box>
                ))}
              </Box>
            </Card>

            {/* Resource Status + Human Resources */}
            <SimpleGrid cols={2} spacing={16} mb={24}>
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                  <Group justify="space-between">
                    <Box>
                      <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Material Resources</Text>
                      <Text size="xs" c="#737373">Critical supplies status</Text>
                    </Box>
                    <Button size="xs" variant="outline" color="gray">Request Resources</Button>
                  </Group>
                </Box>
                <Box p={16}>
                  {resources.map((res, i) => (
                    <Box key={res.name} py={12} className={i < resources.length - 1 ? "border-b border-[#E5E5E5]" : ""}>
                      <Group justify="space-between" mb={8}>
                        <Text fw={500} size="sm">{res.name}</Text>
                        <Text size="xs" c={res.statusColor}>{res.status}</Text>
                      </Group>
                      <Group gap={8}>
                        <Progress value={(res.current / res.total) * 100} size={6} color={res.barColor} style={{ flex: 1 }} />
                        <Text size="xs" c="#A3A3A3">{res.current.toLocaleString()} / {res.total.toLocaleString()}</Text>
                      </Group>
                    </Box>
                  ))}
                </Box>
              </Card>

              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Human Resources</Text>
                  <Text size="xs" c="#737373">Staff deployment breakdown</Text>
                </Box>
                <Box p={16}>
                  {[
                    { label: "Surge Staff", value: 12, total: 20, color: "#DC2626" },
                    { label: "Full Staffing Target", value: 67, total: 85, color: "#2563EB" },
                    { label: "International Staff", value: 8, total: 12, color: "#7C3AED" },
                    { label: "National Staff", value: 59, total: 73, color: "#059669" },
                    { label: "Specialists (WASH/Health)", value: 15, total: 20, color: "#D97706" },
                  ].map((item, i) => (
                    <Box key={item.label} py={12} className={i < 4 ? "border-b border-[#E5E5E5]" : ""}>
                      <Group justify="space-between" mb={8}>
                        <Text fw={500} size="sm">{item.label}</Text>
                        <Text size="xs" c="#737373">{item.value} / {item.total}</Text>
                      </Group>
                      <Progress value={(item.value / item.total) * 100} size={6} color={item.color} />
                    </Box>
                  ))}
                </Box>
              </Card>
            </SimpleGrid>
          </Box>
        )}

        {/* ========== Coordination Tab ========== */}
        {activeTab === "coordination" && (
          <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Group justify="space-between">
                <Box>
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Coordination Partners</Text>
                  <Text size="xs" c="#737373">Organizations in the response</Text>
                </Box>
                <Button size="xs" variant="outline" color="gray">+ Add Partner</Button>
              </Group>
            </Box>
            <Table>
              <Table.Thead>
                <Table.Tr style={{ background: "#F5F5F5" }}>
                  <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Organization</Table.Th>
                  <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Role</Table.Th>
                  <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Coverage Area</Table.Th>
                  <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Contact</Table.Th>
                  <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {partners.map((p) => (
                  <Table.Tr key={p.org}>
                    <Table.Td><Text fw={600} style={{ fontSize: 13 }}>{p.org}</Text></Table.Td>
                    <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{p.role}</Text></Table.Td>
                    <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{p.coverage}</Text></Table.Td>
                    <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{p.contact}</Text></Table.Td>
                    <Table.Td>
                      <Group gap={6}>
                        <IconPointFilled size={10} color={p.statusColor} />
                        <Text c="#525252" style={{ fontSize: 13 }}>{p.status}</Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}
      </Box>
    </Box>
  );
}
