import { Building2, Cpu, FlaskConical, LayoutDashboard, Settings2, TrendingUp, type LucideIcon } from "lucide-react";

export type ScreenId = "dashboard" | "research" | "company" | "cpu" | "components" | "os" | "ai" | "market" | "finance" | "settings";

export interface NavigationItem {
  id: ScreenId;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "research", icon: FlaskConical },
  { id: "company", icon: Building2 },
  { id: "cpu", icon: Cpu },
  { id: "market", icon: TrendingUp },
  { id: "settings", icon: Settings2 },
];
