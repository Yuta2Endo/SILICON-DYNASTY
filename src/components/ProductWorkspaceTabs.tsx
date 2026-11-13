import { Boxes, Cpu } from "lucide-react";

interface ProductWorkspaceTabsProps {
  active: "cpu" | "components";
  label: string;
  cpuLabel: string;
  componentsLabel: string;
  onOpenCpu: () => void;
  onOpenComponents: () => void;
}

export function ProductWorkspaceTabs({
  active,
  label,
  cpuLabel,
  componentsLabel,
  onOpenCpu,
  onOpenComponents,
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
    </nav>
  );
}
