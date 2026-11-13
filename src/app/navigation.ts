import { Building2, Cpu, FlaskConical, LayoutDashboard, Settings2, TrendingUp, type LucideIcon } from "lucide-react";

export type ScreenId = "dashboard" | "research" | "company" | "cpu" | "components" | "os" | "ai" | "devices" | "market" | "finance" | "analytics" | "settings";

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

const mobilePrimaryIds: ScreenId[] = ["dashboard", "research", "cpu", "market"];

export const mobilePrimaryNavigationItems = navigationItems.filter((item) =>
  mobilePrimaryIds.includes(item.id),
);

export const mobileMoreNavigationItems = navigationItems.filter(
  (item) => !mobilePrimaryIds.includes(item.id),
);
