"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  ClipboardList,
  Shield,
  Settings,
  LogOut,
  Radio,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { authClient } from "~/lib/auth-client";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Crises", href: "/crises", icon: AlertTriangle },
  { title: "Data Feeds", href: "/data", icon: Radio },
  { title: "Map", href: "/map", icon: Map },
  { title: "Surveys", href: "/surveys", icon: ClipboardList },
  { title: "Audit Trail", href: "/audit", icon: Shield },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            C
          </div>
          <div>
            <h2 className="text-sm font-semibold">CLEAR</h2>
            <p className="text-xs text-muted-foreground">Crisis Response</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => authClient.signOut()}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
