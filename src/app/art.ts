import type { ResearchCategory } from "../game/models/research";
import type { ScreenId } from "./navigation";

export const APP_ICON_SRC = "/art/brand/app-icon.svg";
export const MANUFACTURING_EMBLEM_SRC = "/art/sections/manufacturing.svg";
export const WAFER_EMBLEM_SRC = "/art/resources/wafer.svg";
export const CPU_DIE_EMBLEM_SRC = "/art/resources/cpu-die.svg";

export const SCREEN_EMBLEMS: Record<ScreenId, string> = {
  dashboard: "/art/sections/dashboard.svg",
  research: "/art/sections/research.svg",
  company: "/art/sections/company.svg",
  cpu: "/art/sections/cpu.svg",
  components: "/art/sections/components.svg",
  os: "/art/sections/os.svg",
  ai: "/art/sections/ai.svg",
  devices: "/art/sections/devices.svg",
  market: "/art/sections/market.svg",
  finance: "/art/sections/finance.svg",
  analytics: "/art/sections/analytics.svg",
  settings: "/art/sections/settings.svg",
};

export const RESEARCH_CATEGORY_EMBLEMS: Record<ResearchCategory, string> = {
  cpu: "/art/sections/cpu.svg",
  memory: "/art/resources/dram.svg",
  graphics: "/art/sections/gpu.svg",
  network: "/art/sections/cloud.svg",
  mobile: "/art/sections/devices.svg",
  ai: "/art/sections/ai.svg",
  robotics: "/art/sections/ecosystem.svg",
  future: "/art/sections/research.svg",
};
