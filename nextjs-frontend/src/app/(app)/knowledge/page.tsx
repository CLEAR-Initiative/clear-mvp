"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Text,
  Card,
  Group,
  Button,
  SimpleGrid,
  Table,
  TextInput,
  UnstyledButton,
  Select,
  ActionIcon,
  Badge,
} from "@mantine/core";
import {
  IconSearch,
  IconUpload,
  IconAlertTriangle,
  IconUsers,
  IconBook,
  IconBookmarks,
  IconFile,
  IconMessageCircle,
  IconWorld,
  IconChevronRight,
  IconRefresh,
  IconUser,
  IconMapPin,
  IconX,
  IconSend,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { HUMCHAT_SYSTEM_PROMPT, buildHumChatPrompt } from "~/lib/prompts";

/* ========== Location Data ========== */
const locationData = {
  regions: [
    { id: "east-africa", name: "East Africa and Yemen", countries: ["ethiopia", "kenya", "somalia", "yemen", "south-sudan", "uganda"] },
    { id: "central-west-africa", name: "Central and West Africa", countries: ["cameroon", "car", "drc", "mali", "niger", "nigeria", "burkina-faso"] },
    { id: "middle-east", name: "Middle East", countries: ["iraq", "jordan", "lebanon", "syria", "palestine"] },
    { id: "asia", name: "Asia", countries: ["afghanistan", "myanmar", "pakistan"] },
    { id: "europe", name: "Europe", countries: ["ukraine"] },
    { id: "americas", name: "Americas", countries: ["colombia", "venezuela"] },
  ],
  countries: {
    ethiopia: { name: "Ethiopia", zones: ["somali", "afar", "oromia", "tigray", "amhara", "snnp"] },
    kenya: { name: "Kenya", zones: ["turkana", "garissa", "wajir", "mandera", "nairobi"] },
    somalia: { name: "Somalia", zones: ["mogadishu", "puntland", "somaliland", "jubaland"] },
    yemen: { name: "Yemen", zones: ["aden", "sanaa", "taiz", "hodeidah"] },
    "south-sudan": { name: "South Sudan", zones: ["juba", "upper-nile", "jonglei"] },
    uganda: { name: "Uganda", zones: ["kampala", "west-nile", "karamoja"] },
    iraq: { name: "Iraq", zones: ["baghdad", "erbil", "mosul", "basra"] },
    syria: { name: "Syria", zones: ["damascus", "aleppo", "idlib", "homs"] },
    afghanistan: { name: "Afghanistan", zones: ["kabul", "herat", "kandahar", "mazar"] },
    ukraine: { name: "Ukraine", zones: ["kyiv", "kharkiv", "odesa", "lviv"] },
    colombia: { name: "Colombia", zones: ["bogota", "medellin", "cali"] },
  } as Record<string, { name: string; zones: string[] }>,
  zones: {
    somali: { name: "Somali Region" },
    afar: { name: "Afar Region" },
    oromia: { name: "Oromia Region" },
    tigray: { name: "Tigray Region" },
    amhara: { name: "Amhara Region" },
    snnp: { name: "SNNP Region" },
  } as Record<string, { name: string }>,
};

/* ========== Content Type Options ========== */
const contentTypes = [
  { value: "all", label: "All Resources" },
  { value: "protocol", label: "Protocols" },
  { value: "guideline", label: "Guidelines" },
  { value: "template", label: "Templates" },
  { value: "contact", label: "Contacts" },
  { value: "training", label: "Training" },
];

/* ========== Active Crises Data ========== */
const activeCrises = [
  {
    id: "cholera-somali",
    name: "Cholera Outbreak",
    location: "Somali Region, Ethiopia",
    severity: "high" as const,
    region: "east-africa",
    country: "ethiopia",
    zone: "somali",
    resources: [
      { title: "NRC Cholera Response Protocol", type: "protocol", updated: "Oct 2025", priority: true },
      { title: "WHO Cholera Treatment Guidelines", type: "guideline", updated: "2024 Edition", priority: false },
      { title: "WASH in Cholera Outbreaks", type: "guideline", updated: "Sphere Standards", priority: false },
      { title: "Cholera Rapid Assessment Tool", type: "template", updated: "Sep 2025", priority: false },
    ],
  },
  {
    id: "flood-afar",
    name: "Flood Emergency",
    location: "Afar Region, Ethiopia",
    severity: "moderate" as const,
    region: "east-africa",
    country: "ethiopia",
    zone: "afar",
    resources: [
      { title: "Flood Early Warning SOP", type: "protocol", updated: "Ethiopia specific", priority: false },
      { title: "Shelter & NFI Kit Standards", type: "guideline", updated: "NRC Global", priority: false },
      { title: "Flood Damage Assessment Form", type: "template", updated: "Aug 2025", priority: false },
    ],
  },
  {
    id: "drought-oromia",
    name: "Drought Response",
    location: "Oromia Region, Ethiopia",
    severity: "moderate" as const,
    region: "east-africa",
    country: "ethiopia",
    zone: "oromia",
    resources: [
      { title: "Drought Early Warning Protocol", type: "protocol", updated: "Jul 2025", priority: false },
      { title: "Cash Transfer Guidelines", type: "guideline", updated: "Aug 2025", priority: false },
    ],
  },
];

/* ========== Documents Data ========== */
const allDocuments = [
  { id: 1, title: "Emergency Response Activation Protocol", type: "protocol", sector: "Multi-sector", region: "all", country: "all", updated: "Oct 2025", downloads: 234, categoryColor: "#DC2626", categoryBg: "#FEE2E2", iconColor: "#DC2626" },
  { id: 2, title: "Rapid Assessment Tool - Ethiopia", type: "template", sector: "Multi-sector", region: "east-africa", country: "ethiopia", updated: "Sep 2025", downloads: 189, categoryColor: "#2563EB", categoryBg: "#DBEAFE", iconColor: "#2563EB" },
  { id: 3, title: "Cash Transfer Guidelines", type: "guideline", sector: "Cash", region: "all", country: "all", updated: "Aug 2025", downloads: 156, categoryColor: "#059669", categoryBg: "#D1FAE5", iconColor: "#059669" },
  { id: 4, title: "WASH Minimum Standards", type: "guideline", sector: "WASH", region: "all", country: "all", updated: "Jul 2025", downloads: 312, categoryColor: "#2563EB", categoryBg: "#DBEAFE", iconColor: "#A3A3A3" },
  { id: 5, title: "Beneficiary Registration Form", type: "template", sector: "Multi-sector", region: "all", country: "all", updated: "Jun 2025", downloads: 445, categoryColor: "#D97706", categoryBg: "#FEF3C7", iconColor: "#A3A3A3" },
  { id: 6, title: "Coordination Meeting Template", type: "template", sector: "Coordination", region: "all", country: "all", updated: "May 2025", downloads: 278, categoryColor: "#7C3AED", categoryBg: "#F3E8FF", iconColor: "#A3A3A3" },
  { id: 7, title: "Protection Monitoring Guidelines", type: "guideline", sector: "Protection", region: "all", country: "all", updated: "Apr 2025", downloads: 198, categoryColor: "#059669", categoryBg: "#D1FAE5", iconColor: "#A3A3A3" },
  { id: 8, title: "Somalia Context Analysis", type: "guideline", sector: "Multi-sector", region: "east-africa", country: "somalia", updated: "Mar 2025", downloads: 145, categoryColor: "#059669", categoryBg: "#D1FAE5", iconColor: "#A3A3A3" },
  { id: 9, title: "Ethiopia Emergency Protocols", type: "protocol", sector: "Multi-sector", region: "east-africa", country: "ethiopia", updated: "Feb 2025", downloads: 267, categoryColor: "#DC2626", categoryBg: "#FEE2E2", iconColor: "#DC2626" },
  { id: 10, title: "Field Staff Training Manual", type: "training", sector: "Multi-sector", region: "all", country: "all", updated: "Jan 2025", downloads: 389, categoryColor: "#7C3AED", categoryBg: "#F3E8FF", iconColor: "#A3A3A3" },
];

/* ========== Contacts Data ========== */
const allContacts = [
  { id: 1, name: "Melese A.", org: "NRC Ethiopia", role: "Emergency Coordinator", region: "east-africa", country: "ethiopia", zone: "all" },
  { id: 2, name: "Dr. Sarah M.", org: "WHO", role: "Health Cluster Lead", region: "east-africa", country: "ethiopia", zone: "somali" },
  { id: 3, name: "Ahmed H.", org: "UNICEF", role: "WASH Cluster Lead", region: "east-africa", country: "ethiopia", zone: "somali" },
  { id: 4, name: "Maria L.", org: "WFP", role: "Logistics Cluster Lead", region: "east-africa", country: "ethiopia", zone: "all" },
  { id: 5, name: "Regional EOC", org: "Somali Region Govt", role: "Govt. Coordination", region: "east-africa", country: "ethiopia", zone: "somali" },
  { id: 6, name: "James K.", org: "NRC Kenya", role: "Country Director", region: "east-africa", country: "kenya", zone: "all" },
  { id: 7, name: "Fatima A.", org: "UNHCR", role: "Protection Officer", region: "east-africa", country: "ethiopia", zone: "afar" },
];

/* ========== HumChat Response Generator ========== */
const generateResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("displacement") || lowerMessage.includes("trend") || lowerMessage.includes("analyze")) {
    return `**Displacement Analysis: Somali Region**

**Current Situation**
- Total IDPs: 1.2M (as of Jan 2026)
- New displacements (30 days): 45,200
- Primary drivers: Drought (62%), Conflict (28%), Floods (10%)

**Key Trends**
1. Westward movement toward urban centers increasing
2. Secondary displacement from overcrowded sites
3. Cross-border movement to Kenya decreasing

**Recommendations**
- Expand site capacity in Jigjiga zone
- Pre-position NFI stock in Gode
- Strengthen protection monitoring`;
  }

  if (lowerMessage.includes("health") || lowerMessage.includes("priority") || lowerMessage.includes("intervention")) {
    return `**Priority Health Interventions**

**Immediate Priorities (0-72 hours)**
1. Cholera response - ORS distribution & treatment centers
2. Maternal health - Emergency obstetric care
3. Malnutrition - SAM/MAM screening & treatment

**Resource Requirements**
- 50,000 ORS sachets
- 200 cholera treatment kits
- 15 additional health workers
- Mobile health teams (3 units)`;
  }

  if (lowerMessage.includes("assessment") || lowerMessage.includes("protection") || lowerMessage.includes("rapid")) {
    return `**Rapid Protection Assessment Plan**

**Assessment Objectives**
1. Identify protection risks and vulnerable groups
2. Map existing protection services
3. Assess community-based protection mechanisms

**Methodology**
- Duration: 5 days
- Team: 4 protection officers, 2 interpreters
- Data collection: KIIs, FGDs, observation`;
  }

  if (lowerMessage.includes("coordination") || lowerMessage.includes("mechanism")) {
    return `**Coordination Mechanisms**

**Recommended Structure**
- Strategic Level: Inter-cluster (Weekly), Govt liaison (Bi-weekly)
- Operational Level: Sector working groups (Weekly)
- Field Level: Site coordination (Daily)

**Key Stakeholders**
- OCHA: Coordination lead
- NRC: Camp management
- WHO: Health cluster`;
  }

  return `Thank you for your question. I can help you with:

1. **Analysis** - Situation briefs, trend analysis
2. **Planning** - Response planning, resource allocation
3. **Protocols** - SOPs, guidelines
4. **Coordination** - Meeting briefs, communications

Please provide more details about the specific crisis or location.`;
};

const exampleQuestions = [
  "Analyze displacement trends in Somali Region",
  "What are the priority interventions for health emergencies?",
  "Generate a rapid assessment plan for protection risks",
];

/* ========== HumChat Message Type ========== */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: `Hello! I'm **HumChat**, your AI assistant for humanitarian operations. I'm trained on IASC guidelines, Sphere standards, and Ethiopia-specific humanitarian context.

I can help you with:
- **Situation analysis** and crisis briefs
- **Response planning** and resource allocation
- **Protocol guidance** for emergencies
- **Coordination** support and communications

What humanitarian challenge can I help you address today?`,
  timestamp: new Date(),
};

/* ========== HumChat Sidebar Component ========== */
function HumChatSidebar({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const llmMutation = api.llm.query.useMutation();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    llmMutation.mutate(
      {
        prompt: buildHumChatPrompt(content.trim()),
        system: HUMCHAT_SYSTEM_PROMPT,
        temperature: 0.4,
        maxTokens: 800,
      },
      {
        onSuccess: (data) => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: data.response,
              timestamp: new Date(),
            },
          ]);
        },
        onError: () => {
          // Fallback to local response generator
          const fallbackResponse = generateResponse(content);
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: fallbackResponse,
              timestamp: new Date(),
            },
          ]);
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage(inputValue);
    }
  };

  const renderMarkdown = (content: string) => {
    const html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:600">$1</strong>')
      .replace(/^- (.*$)/gim, '<div style="margin-left:12px;font-size:13px">• $1</div>')
      .replace(/^\d+\. (.*$)/gim, '<div style="margin-left:12px;font-size:13px">$&</div>')
      .replace(/\n\n/g, '<div style="height:8px"></div>')
      .replace(/\n/g, "<br />");
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  if (!isExpanded) {
    return (
      <Box
        style={{
          position: "fixed",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 50,
        }}
      >
        <UnstyledButton
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#E85D3D",
            color: "white",
            padding: "16px 10px",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <IconMessageCircle size={16} />
          <span>HumChat AI</span>
        </UnstyledButton>
      </Box>
    );
  }

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%", background: "white", borderLeft: "1px solid #E5E5E5" }}>
      {/* Header */}
      <Box px={16} py={12} className="border-b border-[#E5E5E5]" style={{ background: "#F9FAFB" }}>
        <Group justify="space-between">
          <Group gap={8}>
            <Box
              style={{
                width: 32,
                height: 32,
                background: "#E85D3D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconWorld size={16} color="white" />
            </Box>
            <Box>
              <Text fw={600} c="#171717" style={{ fontSize: 13 }}>HumChat AI</Text>
              <Text c="#737373" style={{ fontSize: 10 }}>Humanitarian AI Assistant</Text>
            </Box>
          </Group>
          <Group gap={4}>
            <Badge size="xs" color="green" variant="light" leftSection={
              <Box style={{ width: 6, height: 6, background: "#059669", borderRadius: "50%" }} />
            }>
              Online
            </Badge>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={() => setMessages([welcomeMessage])}
              title="Clear chat"
            >
              <IconRefresh size={14} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={onToggle}
              title="Collapse panel"
            >
              <IconChevronRight size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      {/* Messages */}
      <Box style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((message) => (
          <Box key={message.id} style={{ display: "flex", gap: 8, flexDirection: message.role === "user" ? "row-reverse" : "row" }}>
            <Box
              style={{
                width: 24,
                height: 24,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: message.role === "assistant" ? "#FEF2F0" : "#F0F0F0",
              }}
            >
              {message.role === "assistant" ? <IconWorld size={12} color="#E85D3D" /> : <IconUser size={12} color="#525252" />}
            </Box>
            <Box style={{ flex: 1, textAlign: message.role === "user" ? "right" : "left" }}>
              {message.role === "assistant" && (
                <Text c="#E85D3D" style={{ fontSize: 10, fontWeight: 500, marginBottom: 4 }}>HAI</Text>
              )}
              <Box
                style={{
                  display: "inline-block",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 13,
                  background: message.role === "assistant" ? "#F9FAFB" : "#E85D3D",
                  color: message.role === "assistant" ? "#525252" : "white",
                  border: message.role === "assistant" ? "1px solid #E5E5E5" : "none",
                  maxWidth: "90%",
                }}
              >
                {message.role === "assistant" ? renderMarkdown(message.content) : <Text style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{message.content}</Text>}
              </Box>
              {message.role === "assistant" && (
                <Text c="#A3A3A3" style={{ fontSize: 9, marginTop: 4 }}>
                  {message.timestamp.toLocaleString([], { month: "numeric", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Text>
              )}
            </Box>
          </Box>
        ))}
        {isTyping && (
          <Box style={{ display: "flex", gap: 8 }}>
            <Box style={{ width: 24, height: 24, background: "#FEF2F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconWorld size={12} color="#E85D3D" />
            </Box>
            <Box style={{ background: "#F9FAFB", border: "1px solid #E5E5E5", padding: "8px 12px" }}>
              <Box style={{ display: "flex", gap: 4 }}>
                <Box style={{ width: 6, height: 6, background: "#A3A3A3", borderRadius: "50%", animation: "bounce 1s infinite 0ms" }} />
                <Box style={{ width: 6, height: 6, background: "#A3A3A3", borderRadius: "50%", animation: "bounce 1s infinite 150ms" }} />
                <Box style={{ width: 6, height: 6, background: "#A3A3A3", borderRadius: "50%", animation: "bounce 1s infinite 300ms" }} />
              </Box>
            </Box>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box className="border-t border-[#E5E5E5]" p={12} style={{ background: "#F9FAFB" }}>
        <Group gap={8}>
          <TextInput
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about humanitarian response..."
            size="xs"
            style={{ flex: 1 }}
            disabled={isTyping}
          />
          <ActionIcon
            size="md"
            onClick={() => void handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            style={{
              background: inputValue.trim() && !isTyping ? "#E85D3D" : "#E5E5E5",
              color: inputValue.trim() && !isTyping ? "white" : "#A3A3A3",
            }}
          >
            <IconSend size={14} />
          </ActionIcon>
        </Group>
        <Box mt={8} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {exampleQuestions.map((q, i) => (
            <UnstyledButton
              key={i}
              onClick={() => void handleSendMessage(q)}
              style={{ fontSize: 11, color: "#737373", textAlign: "left", padding: "2px 0" }}
              className="hover:text-[#E85D3D]"
            >
              &ldquo;{q}&rdquo;
            </UnstyledButton>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/* ========== Type Color Helper ========== */
function getTypeColor(type: string): { color: string; bg: string } {
  switch (type) {
    case "protocol": return { color: "#DC2626", bg: "#FEE2E2" };
    case "guideline": return { color: "#059669", bg: "#D1FAE5" };
    case "template": return { color: "#2563EB", bg: "#DBEAFE" };
    case "training": return { color: "#7C3AED", bg: "#F3E8FF" };
    default: return { color: "#525252", bg: "#F5F5F5" };
  }
}

/* ========== Main Knowledge Page ========== */
export default function KnowledgePage() {
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Location filters
  const [selectedRegion, setSelectedRegion] = useState<string | null>("all");
  const [selectedCountry, setSelectedCountry] = useState<string | null>("all");
  const [selectedZone, setSelectedZone] = useState<string | null>("all");
  const [selectedType, setSelectedType] = useState<string | null>("all");

  // Available countries based on selected region
  const availableCountries = useMemo(() => {
    const region = selectedRegion ?? "all";
    if (region === "all") return [{ value: "all", label: "All Countries" }];
    const regionData = locationData.regions.find((r) => r.id === region);
    if (!regionData) return [{ value: "all", label: "All Countries" }];
    return [
      { value: "all", label: "All Countries" },
      ...regionData.countries.map((c) => ({ value: c, label: locationData.countries[c]?.name ?? c })),
    ];
  }, [selectedRegion]);

  // Available zones based on selected country
  const availableZones = useMemo(() => {
    const country = selectedCountry ?? "all";
    if (country === "all") return [{ value: "all", label: "All Zones" }];
    const countryData = locationData.countries[country];
    if (!countryData) return [{ value: "all", label: "All Zones" }];
    return [
      { value: "all", label: "All Zones" },
      ...countryData.zones.map((z) => ({ value: z, label: locationData.zones[z]?.name ?? z })),
    ];
  }, [selectedCountry]);

  // Reset dependent filters when parent changes
  useEffect(() => {
    setSelectedCountry("all");
    setSelectedZone("all");
  }, [selectedRegion]);

  useEffect(() => {
    setSelectedZone("all");
  }, [selectedCountry]);

  // Filter crises
  const filteredCrises = useMemo(() => {
    const region = selectedRegion ?? "all";
    const country = selectedCountry ?? "all";
    const zone = selectedZone ?? "all";
    return activeCrises.filter((crisis) => {
      if (region !== "all" && crisis.region !== region) return false;
      if (country !== "all" && crisis.country !== country) return false;
      if (zone !== "all" && crisis.zone !== zone) return false;
      return true;
    });
  }, [selectedRegion, selectedCountry, selectedZone]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    const region = selectedRegion ?? "all";
    const country = selectedCountry ?? "all";
    const type = selectedType ?? "all";
    return allDocuments.filter((doc) => {
      if (region !== "all" && doc.region !== "all" && doc.region !== region) return false;
      if (country !== "all" && doc.country !== "all" && doc.country !== country) return false;
      if (type !== "all" && doc.type !== type) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!doc.title.toLowerCase().includes(query) && !doc.sector.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [selectedRegion, selectedCountry, selectedType, searchQuery]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    const region = selectedRegion ?? "all";
    const country = selectedCountry ?? "all";
    const zone = selectedZone ?? "all";
    return allContacts.filter((contact) => {
      if (region !== "all" && contact.region !== region) return false;
      if (country !== "all" && contact.country !== country) return false;
      if (zone !== "all" && contact.zone !== "all" && contact.zone !== zone) return false;
      return true;
    });
  }, [selectedRegion, selectedCountry, selectedZone]);

  const hasActiveFilters = (selectedRegion ?? "all") !== "all" || (selectedCountry ?? "all") !== "all" || (selectedZone ?? "all") !== "all" || (selectedType ?? "all") !== "all" || searchQuery;

  const clearFilters = () => {
    setSelectedRegion("all");
    setSelectedCountry("all");
    setSelectedZone("all");
    setSelectedType("all");
    setSearchQuery("");
  };

  return (
    <Box style={{ display: "flex", height: "100vh" }}>
      {/* Main Content */}
      <Box style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.3s ease" }}>
        {/* Header */}
        <Box px={24} py={12} className="border-b border-[#E5E5E5]" style={{ background: "#FFFFFF", flexShrink: 0 }}>
          <Group justify="space-between">
            <Text fw={600} c="#171717" style={{ fontSize: 16 }}>Knowledge Hub</Text>
            <Group gap={8}>
              <TextInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                placeholder="Search documents..."
                size="xs"
                leftSection={<IconSearch size={14} />}
                style={{ width: 200 }}
              />
              <Button size="xs" leftSection={<IconUpload size={14} />} style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}>
                Upload
              </Button>
            </Group>
          </Group>
        </Box>

        <Box style={{ flex: 1, overflowY: "auto" }} p={24}>
          {/* Location Filters Bar */}
          <Card p={16} mb={24} style={{ border: "1px solid #E5E5E5" }}>
            <Group gap={8} mb={12}>
              <IconMapPin size={16} color="#E85D3D" />
              <Text fw={600} c="#171717" style={{ fontSize: 13 }}>Filter by Location & Type</Text>
              {hasActiveFilters && (
                <UnstyledButton
                  onClick={clearFilters}
                  ml="auto"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#737373" }}
                  className="hover:text-[#E85D3D]"
                >
                  <IconX size={12} /> Clear filters
                </UnstyledButton>
              )}
            </Group>
            <Group gap={12}>
              <Select
                label="Region"
                size="xs"
                value={selectedRegion}
                onChange={setSelectedRegion}
                data={[
                  { value: "all", label: "All Regions" },
                  ...locationData.regions.map((r) => ({ value: r.id, label: r.name })),
                ]}
                style={{ minWidth: 180 }}
                styles={{ label: { fontSize: 11, color: "#737373", fontWeight: 500 } }}
              />
              <Select
                label="Country"
                size="xs"
                value={selectedCountry}
                onChange={setSelectedCountry}
                data={availableCountries}
                disabled={(selectedRegion ?? "all") === "all"}
                style={{ minWidth: 160 }}
                styles={{ label: { fontSize: 11, color: "#737373", fontWeight: 500 } }}
              />
              <Select
                label="Zone"
                size="xs"
                value={selectedZone}
                onChange={setSelectedZone}
                data={availableZones}
                disabled={(selectedCountry ?? "all") === "all"}
                style={{ minWidth: 160 }}
                styles={{ label: { fontSize: 11, color: "#737373", fontWeight: 500 } }}
              />
              <Box style={{ borderLeft: "1px solid #E5E5E5", height: 32, margin: "auto 4px" }} />
              <Select
                label="Type"
                size="xs"
                value={selectedType}
                onChange={setSelectedType}
                data={contentTypes}
                style={{ minWidth: 140 }}
                styles={{ label: { fontSize: 11, color: "#737373", fontWeight: 500 } }}
              />
            </Group>
          </Card>

          {/* Active Crisis Resources */}
          {filteredCrises.length > 0 && (
            <Card p={0} mb={24} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Active Crisis Resources</Text>
                <Text size="xs" c="#737373">{filteredCrises.length} active {filteredCrises.length === 1 ? "crisis" : "crises"} in selected location</Text>
              </Box>
              {filteredCrises.map((crisis, i) => (
                <Box key={crisis.id} px={16} py={16} className={i < filteredCrises.length - 1 ? "border-b border-[#E5E5E5]" : ""}>
                  <Group gap={8} mb={12}>
                    <Box style={{ width: 8, height: 8, background: crisis.severity === "high" ? "#DC2626" : "#D97706" }} />
                    <Text fw={600} c="#171717" style={{ fontSize: 13 }}>{crisis.name}</Text>
                    <Text size="xs" c="#737373">• {crisis.location}</Text>
                  </Group>
                  <SimpleGrid cols={4} spacing={8}>
                    {crisis.resources.map((resource, idx) => (
                      <Box
                        key={idx}
                        p={8}
                        style={{ background: "#F9FAFB", display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}
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
            </Card>
          )}

          {/* Two Column: Document Library + Contacts */}
          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing={16}>
            {/* Document Library - 2 cols */}
            <Box style={{ gridColumn: "span 2" }}>
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Document Library</Text>
                  <Text size="xs" c="#737373">{filteredDocuments.length} documents found</Text>
                </Box>
                <Table>
                  <Table.Thead>
                    <Table.Tr style={{ background: "#F5F5F5" }}>
                      <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Document</Table.Th>
                      <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600, width: 90 }}>Type</Table.Th>
                      <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600, width: 90 }}>Sector</Table.Th>
                      <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600, width: 80 }}>Updated</Table.Th>
                      <Table.Th style={{ fontSize: 11, width: 50 }}></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredDocuments.map((doc) => {
                      const tc = getTypeColor(doc.type);
                      return (
                        <Table.Tr key={doc.id}>
                          <Table.Td>
                            <Group gap={8}>
                              <IconFile size={16} color={doc.iconColor} />
                              <Text fw={500} style={{ fontSize: 13 }}>{doc.title}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text px={6} py={2} style={{ background: tc.bg, color: tc.color, display: "inline-block", fontSize: 11 }}>
                              {doc.type}
                            </Text>
                          </Table.Td>
                          <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{doc.sector}</Text></Table.Td>
                          <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{doc.updated}</Text></Table.Td>
                          <Table.Td>
                            <Text c="#2563EB" style={{ cursor: "pointer", fontSize: 12 }}>Download</Text>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                    {filteredDocuments.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={5}>
                          <Text ta="center" c="#737373" py={24} style={{ fontSize: 13 }}>No documents found matching your filters</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Card>
            </Box>

            {/* Key Contacts - 1 col */}
            <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Key Contacts</Text>
                <Text size="xs" c="#737373">{filteredContacts.length} contacts</Text>
              </Box>
              <Box style={{ maxHeight: 400, overflowY: "auto" }}>
                {filteredContacts.map((contact) => (
                  <Box key={contact.id} p={12} className="border-b border-[#F0F0F0] hover:bg-[#F9FAFB]">
                    <Text fw={500} c="#171717" style={{ fontSize: 13 }}>{contact.name}</Text>
                    <Text c="#737373" style={{ fontSize: 12 }}>{contact.org}</Text>
                    <Text c="#E85D3D" mt={4} style={{ fontSize: 12 }}>{contact.role}</Text>
                    <Group gap={8} mt={8}>
                      <Text c="#A3A3A3" style={{ fontSize: 11, cursor: "pointer" }} className="hover:text-[#E85D3D]">Email</Text>
                      <Text c="#E5E5E5">•</Text>
                      <Text c="#A3A3A3" style={{ fontSize: 11, cursor: "pointer" }} className="hover:text-[#E85D3D]">Call</Text>
                    </Group>
                  </Box>
                ))}
                {filteredContacts.length === 0 && (
                  <Box p={24}>
                    <Text ta="center" c="#737373" style={{ fontSize: 13 }}>No contacts found for this location</Text>
                  </Box>
                )}
              </Box>
            </Card>
          </SimpleGrid>
        </Box>
      </Box>

      {/* HumChat Sidebar */}
      <Box
        style={{
          width: isChatExpanded ? 380 : 0,
          flexShrink: 0,
          transition: "width 0.3s ease",
          overflow: "hidden",
          height: "100vh",
        }}
      >
        <HumChatSidebar isExpanded={isChatExpanded} onToggle={() => setIsChatExpanded(!isChatExpanded)} />
      </Box>
      {!isChatExpanded && (
        <HumChatSidebar isExpanded={false} onToggle={() => setIsChatExpanded(true)} />
      )}

      {/* Bounce animation for typing indicator */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </Box>
  );
}
