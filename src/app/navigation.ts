import { Building2, Cpu, LayoutDashboard, Settings2, type LucideIcon } from "lucide-react";

export type ScreenId = "dashboard" | "company" | "cpu" | "settings";

export interface NavigationItem {
  id: ScreenId;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "company", icon: Building2 },
  { id: "cpu", icon: Cpu },
  { id: "settings", icon: Settings2 },
];
