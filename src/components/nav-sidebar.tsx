"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  Text,
  Badge,
  Checkbox,
  UnstyledButton,
  Group,
  Stack,
} from "@mantine/core";
import {
  IconLayoutDashboard,
  IconTarget,
  IconChartPie,
  IconChartBar,
  IconUser,
  IconCurrencyDollar,
  IconBook,
  IconMapPin,
  IconLogout,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { cn } from "~/lib/utils";
import { authClient } from "~/lib/auth-client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "Overview", href: "/dashboard", icon: IconLayoutDashboard },
      { label: "Detection", href: "/detection", icon: IconTarget, badge: 3 },
      { label: "Analysis", href: "/analysis", icon: IconChartPie },
      { label: "Operations", href: "/operations", icon: IconUser, badge: 2 },
      { label: "Cash Assistance", href: "/cash", icon: IconCurrencyDollar },
      { label: "Analytics", href: "/analytics", icon: IconChartBar },
    ],
  },
  {
    title: "RESOURCES",
    items: [
      { label: "Knowledge Hub", href: "/knowledge", icon: IconBook },
      { label: "Crisis Map", href: "/map", icon: IconMapPin },
    ],
  },
];

interface DataLayer {
  id: string;
  label: string;
  color: string;
  defaultChecked: boolean;
}

const dataLayers: DataLayer[] = [
  { id: "layer-cholera", label: "Cholera Cases", color: "#DC2626", defaultChecked: true },
  { id: "layer-flood", label: "Flood Risk", color: "#D97706", defaultChecked: true },
  { id: "layer-drought", label: "Drought Zones", color: "#D97706", defaultChecked: false },
  { id: "layer-response", label: "Response Teams", color: "#059669", defaultChecked: true },
];

const activeCrises = [
  { id: "1", label: "Cholera Outbreak", color: "#DC2626", pulse: true },
  { id: "2", label: "Flooding Risk", color: "#D97706", pulse: false },
  { id: "3", label: "Drought Monitoring", color: "#D97706", pulse: false },
];

export function NavSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isCrisisPage = pathname.startsWith("/crisis/");
  const [layers, setLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(dataLayers.map((l) => [l.id, l.defaultChecked]))
  );

  const handleLayerToggle = (id: string) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch {
      // ignore
    }
    router.push("/auth/login");
  };

  return (
    <Box
      component="aside"
      w={240}
      className="shrink-0 flex flex-col bg-white border-r border-border"
      style={{ height: "100vh" }}
    >
      {/* Logo */}
      <Box px={20} py={20} className="border-b border-border">
        <Text fw={700} size="xl" c="#E85D3D" style={{ letterSpacing: "-0.025em" }}>
          CLEAR
        </Text>
        <Text c="#737373" mt={2} style={{ fontSize: 11 }}>
          Ethiopia Response Dashboard
        </Text>
      </Box>

      {/* Navigation */}
      <Box component="nav" className="flex-1 overflow-y-auto" p={12}>
        {navSections.map((section) => (
          <Stack key={section.title} gap={0} mb={16}>
            <Text
              size="xs"
              fw={600}
              c="#737373"
              tt="uppercase"
              px={12}
              pt={8}
              pb={4}
              style={{ letterSpacing: "0.05em", fontSize: "10px" }}
            >
              {section.title}
            </Text>
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <UnstyledButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  px={12}
                  py={10}
                  className={cn(
                    "flex items-center gap-2.5 text-[13px] font-medium transition-all duration-150 no-underline",
                    isActive
                      ? "bg-[#FEF2F0] text-[#E85D3D]"
                      : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#171717]",
                  )}
                >
                  <Group gap={10} wrap="nowrap" style={{ flex: 1 }}>
                    <Icon
                      size={18}
                      style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}
                    />
                    <Text size="sm" fw={500} style={{ fontSize: "13px" }}>
                      {item.label}
                    </Text>
                    {item.badge !== undefined && (
                      <Badge
                        size="xs"
                        color="red"
                        variant="filled"
                        ml="auto"
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          minWidth: 18,
                          padding: "0 6px",
                        }}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        ))}
      </Box>

      {/* Data Layers or Active Crises (context-dependent) */}
      <Box className="border-t border-border" p={12}>
        {isCrisisPage ? (
          <>
            <Text
              size="xs"
              fw={600}
              c="#737373"
              tt="uppercase"
              px={12}
              pt={8}
              pb={4}
              style={{ letterSpacing: "0.05em", fontSize: "10px" }}
            >
              Active Crises
            </Text>
            {activeCrises.map((crisis) => {
              const isActiveCrisis = pathname === `/crisis/${crisis.id}`;
              return (
                <UnstyledButton
                  key={crisis.id}
                  component={Link}
                  href={`/crisis/${crisis.id}`}
                  px={12}
                  py={10}
                  className={cn(
                    "flex items-center gap-2.5 text-[13px] font-medium transition-all duration-150 no-underline w-full",
                    isActiveCrisis
                      ? "bg-[#FEF2F0] text-[#E85D3D]"
                      : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#171717]",
                  )}
                  style={{
                    borderLeft: `3px solid ${crisis.color}`,
                    marginLeft: -12,
                    paddingLeft: 21,
                  }}
                >
                  <Box
                    w={8}
                    h={8}
                    style={{
                      background: crisis.color,
                      flexShrink: 0,
                      animation: crisis.pulse ? "pulse-dot 2s ease-in-out infinite" : "none",
                    }}
                  />
                  <Text size="sm" fw={500} style={{ fontSize: "13px" }}>
                    {crisis.label}
                  </Text>
                </UnstyledButton>
              );
            })}
          </>
        ) : (
          <>
            <Text
              size="xs"
              fw={600}
              c="#737373"
              tt="uppercase"
              px={12}
              pt={8}
              pb={4}
              style={{ letterSpacing: "0.05em", fontSize: "10px" }}
            >
              Data Layers
            </Text>
            {dataLayers.map((layer) => (
              <label
                key={layer.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                  color: "#525252",
                }}
              >
                <Checkbox
                  size="xs"
                  checked={layers[layer.id]}
                  onChange={() => handleLayerToggle(layer.id)}
                  styles={{
                    input: {
                      cursor: "pointer",
                      accentColor: layer.color,
                    },
                  }}
                />
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: layer.color,
                    flexShrink: 0,
                  }}
                />
                <Text size="xs" c="#525252">{layer.label}</Text>
              </label>
            ))}
          </>
        )}
      </Box>

      {/* User Actions */}
      <Box className="border-t border-[#E5E5E5]" p={12}>
        <UnstyledButton
          component={Link}
          href="/profile"
          px={12}
          py={8}
          className="flex items-center gap-2.5 text-[12px] text-[#525252] hover:bg-[#F5F5F5] transition-all duration-150 no-underline w-full"
        >
          <IconUser size={16} style={{ opacity: 0.7 }} />
          <Text size="xs" fw={500}>Profile</Text>
        </UnstyledButton>
        <UnstyledButton
          onClick={handleLogout}
          px={12}
          py={8}
          className="flex items-center gap-2.5 text-[12px] text-[#DC2626] hover:bg-[#FEE2E2] transition-all duration-150 w-full"
        >
          <IconLogout size={16} style={{ opacity: 0.7 }} />
          <Text size="xs" fw={500} c="#DC2626">Sign Out</Text>
        </UnstyledButton>
      </Box>
    </Box>
  );
}
