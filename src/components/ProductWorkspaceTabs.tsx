import { Boxes, BrainCircuit, Cpu, Laptop, MonitorCog } from "lucide-react";

interface ProductWorkspaceTabsProps {
  active: "cpu" | "components" | "os" | "ai" | "devices";
  label: string;
  cpuLabel: string;
  componentsLabel: string;
  osLabel: string;
  aiLabel: string;
  devicesLabel: string;
  onOpenCpu: () => void;
  onOpenComponents: () => void;
  onOpenOs: () => void;
  onOpenAi: () => void;
  onOpenDevices: () => void;
}

export function ProductWorkspaceTabs({
  active,
  label,
  cpuLabel,
  componentsLabel,
  osLabel,
  aiLabel,
  devicesLabel,
  onOpenCpu,
  onOpenComponents,
  onOpenOs,
  onOpenAi,
  onOpenDevices,
}: ProductWorkspaceTabsProps) {
  return (
    <nav className="product-workspace-tabs" aria-label={label}>
      <button
        aria-current={active === "cpu" ? "page" : undefined}
        className={`product-workspace-tab${active === "cpu" ? " is-active" : ""}`}
        onClick={onOpenCpu}
        type="button"
      >
        <Cpu aria-hidden="true" size={17} />
        {cpuLabel}
      </button>
      <button
        aria-current={active === "components" ? "page" : undefined}
        className={`product-workspace-tab${active === "components" ? " is-active" : ""}`}
        onClick={onOpenComponents}
        type="button"
      >
        <Boxes aria-hidden="true" size={17} />
        {componentsLabel}
      </button>
      <button
        aria-current={active === "os" ? "page" : undefined}
        className={`product-workspace-tab${active === "os" ? " is-active" : ""}`}
        onClick={onOpenOs}
        type="button"
      >
        <MonitorCog aria-hidden="true" size={17} />
        {osLabel}
      </button>
      <button
        aria-current={active === "ai" ? "page" : undefined}
        className={`product-workspace-tab${active === "ai" ? " is-active" : ""}`}
        onClick={onOpenAi}
        type="button"
      >
        <BrainCircuit aria-hidden="true" size={17} />
        {aiLabel}
      </button>
      <button
        aria-current={active === "devices" ? "page" : undefined}
        className={`product-workspace-tab${active === "devices" ? " is-active" : ""}`}
        onClick={onOpenDevices}
        type="button"
      >
        <Laptop aria-hidden="true" size={17} />
        {devicesLabel}
      </button>
    </nav>
  );
}
