import { useState, type KeyboardEvent } from "react";
import { Cpu, Layers3, Zap } from "lucide-react";
import {
  buildGpuVisualModel,
  getGpuHeatTier,
  type GpuBoardModule,
  type GpuDieBlock,
  type GpuPreviewView,
} from "../../game/models/gpu-board";
import type { GpuConfiguration } from "../../game/models/components";
import { formatDecimal, formatNumber } from "../../localization/formatters";
import { translations, type TranslationMessages } from "../../localization/messages";

type GpuPreviewCopy = TranslationMessages["components"]["gpuPreview"];

interface GpuBoardPreviewProps {
  configuration: GpuConfiguration;
  locale: "ru" | "en";
}

interface BoardModuleShapeProps {
  copy: GpuPreviewCopy;
  locale: "ru" | "en";
  module: GpuBoardModule;
  onSelect: (id: string) => void;
  selected: boolean;
}

interface DieBlockShapeProps {
  block: GpuDieBlock;
  copy: GpuPreviewCopy;
  locale: "ru" | "en";
  onSelect: (id: string) => void;
  selected: boolean;
}

const BOX_INSET = 6;

function moduleAriaLabel(module: GpuBoardModule, copy: GpuPreviewCopy, locale: "ru" | "en"): string {
  const label = copy.modules[module.kind];
  const heat = `${copy.heat}: ${formatNumber(module.heat, locale)}`;
  if (module.kind === "vram" && module.capacityGb !== undefined) {
    return `${label}, ${formatNumber(module.capacityGb, locale)} ${copy.units.gb}, ${heat}`;
  }
  return `${label}, ${heat}`;
}

function dieBlockAriaLabel(block: GpuDieBlock, copy: GpuPreviewCopy, locale: "ru" | "en"): string {
  return `${copy.blocks[block.kind]}, ${copy.heat}: ${formatNumber(block.heat, locale)}`;
}

function selectOnKeyboard(event: KeyboardEvent<SVGGElement>, onSelect: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect();
  }
}

function BoardModuleShape({ copy, locale, module, onSelect, selected }: BoardModuleShapeProps) {
  const tier = getGpuHeatTier(module.heat);
  const centerX = module.x + module.width / 2;
  const classes = [
    "gpu-board__module",
    `gpu-board__module--${module.kind}`,
    `is-${tier}`,
    selected ? "is-selected" : "",
  ].filter(Boolean).join(" ");

  return (
    <g
      aria-label={moduleAriaLabel(module, copy, locale)}
      aria-pressed={selected}
      className={classes}
      onClick={() => onSelect(module.id)}
      onKeyDown={(event) => selectOnKeyboard(event, () => onSelect(module.id))}
      role="button"
      tabIndex={0}
    >
      <title>{moduleAriaLabel(module, copy, locale)}</title>
      {module.kind === "die" && (
        <>
          <rect
            className="gpu-board__module-body"
            height={module.height}
            rx={8}
            width={module.width}
            x={module.x}
            y={module.y}
          />
          <rect
            className="gpu-board__die-package"
            height={module.height - 12}
            rx={4}
            width={module.width - 12}
            x={module.x + BOX_INSET}
            y={module.y + BOX_INSET}
          />
          <rect
            className="gpu-board__die-silicon"
            height={module.height - 28}
            rx={2}
            width={module.width - 28}
            x={module.x + 14}
            y={module.y + 14}
          />
          {Array.from({ length: Math.min(module.count ?? 1, 12) }, (_, index) => (
            <rect
              className="gpu-board__die-cell"
              height={10}
              key={index}
              rx={1}
              width={14}
              x={module.x + 18 + (index % 4) * 18}
              y={module.y + 20 + Math.floor(index / 4) * 12}
            />
          ))}
          <text
            className="gpu-board__module-label"
            textAnchor="middle"
            x={centerX}
            y={module.y + module.height - 7}
          >
            {copy.modules.die}
          </text>
        </>
      )}

      {module.kind === "vram" && (
        <>
          <rect
            className="gpu-board__module-body"
            height={module.height}
            rx={3}
            width={module.width}
            x={module.x}
            y={module.y}
          />
          <rect
            className="gpu-board__vram-chip"
            height={module.height - 9}
            rx={1.5}
            width={module.width - 6}
            x={module.x + 3}
            y={module.y + 3}
          />
          <text
            className="gpu-board__module-label"
            textAnchor="middle"
            x={centerX}
            y={module.y + module.height - 2.5}
          >
            {formatNumber(module.capacityGb ?? 0, locale)} {copy.units.gb}
          </text>
        </>
      )}

      {module.kind === "vrm" && (
        <>
          <rect
            className="gpu-board__module-body"
            height={module.height}
            rx={2}
            width={module.width}
            x={module.x}
            y={module.y}
          />
          {Array.from({ length: Math.min(module.count ?? 1, 12) }, (_, index) => {
            const count = Math.min(module.count ?? 1, 12);
            const segmentWidth = module.width / count;
            return (
              <rect
                className="gpu-board__vrm-phase"
                height={module.height - 6}
                key={index}
                rx={1}
                width={Math.max(1, segmentWidth - 1.4)}
                x={module.x + index * segmentWidth + 0.7}
                y={module.y + 3}
              />
            );
          })}
          <text
            className="gpu-board__module-label"
            textAnchor="middle"
            x={centerX}
            y={module.y + module.height - 2.2}
          >
            {copy.modules.vrm}
          </text>
        </>
      )}

      {module.kind === "pcie" && (
        <>
          <rect
            className="gpu-board__module-body"
            height={module.height}
            rx={1.5}
            width={module.width}
            x={module.x}
            y={module.y}
          />
          {Array.from({ length: 18 }, (_, index) => (
            <line
              className="gpu-board__pcie-finger"
              key={index}
              x1={module.x + 4 + index * 8}
              x2={module.x + 4 + index * 8}
              y1={module.y + 1.5}
              y2={module.y + module.height - 1.5}
            />
          ))}
        </>
      )}

      {module.kind === "display" && (
        <>
          <rect
            className="gpu-board__module-body"
            height={module.height}
            rx={2}
            width={module.width}
            x={module.x}
            y={module.y}
          />
          {Array.from({ length: module.count ?? 1 }, (_, index) => (
            <rect
              className="gpu-board__display-port"
              height={12}
              key={index}
              rx={1}
              width={5}
              x={module.x + 3}
              y={module.y + 7 + index * 18}
            />
          ))}
        </>
      )}

      {module.kind === "power" && (
        <>
          <rect
            className="gpu-board__module-body"
            height={module.height}
            rx={2}
            width={module.width}
            x={module.x}
            y={module.y}
          />
          {Array.from({ length: 8 }, (_, index) => (
            <circle
              className="gpu-board__power-pin"
              cx={module.x + 6 + index * 5}
              cy={module.y + module.height / 2}
              key={index}
              r={1.3}
            />
          ))}
        </>
      )}
    </g>
  );
}

function DieBlockShape({ block, copy, locale, onSelect, selected }: DieBlockShapeProps) {
  const tier = getGpuHeatTier(block.heat);
  const classes = [
    "gpu-die__block",
    `gpu-die__block--${block.kind}`,
    `is-${tier}`,
    selected ? "is-selected" : "",
  ].filter(Boolean).join(" ");
  const label = block.kind === "compute"
    ? block.count === undefined
      ? `CU ${(block.index ?? 0) + 1}`
      : `+${block.count}`
    : block.kind === "memory-controller"
      ? "MC"
      : block.kind === "cache"
        ? "L2"
        : block.kind === "rt"
          ? "RT"
          : "DSP";

  return (
    <g
      aria-label={dieBlockAriaLabel(block, copy, locale)}
      aria-pressed={selected}
      className={classes}
      onClick={() => onSelect(block.id)}
      onKeyDown={(event) => selectOnKeyboard(event, () => onSelect(block.id))}
      role="button"
      tabIndex={0}
    >
      <title>{dieBlockAriaLabel(block, copy, locale)}</title>
      <rect
        className="gpu-die__block-body"
        height={block.height}
        rx={2}
        width={block.width}
        x={block.x}
        y={block.y}
      />
      <text
        className="gpu-die__block-label"
        textAnchor="middle"
        x={block.x + block.width / 2}
        y={block.y + block.height / 2 + 1.5}
      >
        {label}
      </text>
    </g>
  );
}

function HeatBar({ heat, locale }: { heat: number; locale: "ru" | "en" }) {
  return (
    <div className="gpu-board-preview__heat">
      <span style={{ width: `${Math.max(2, Math.min(100, heat))}%` }} />
      <small>{formatNumber(heat, locale)}/100</small>
    </div>
  );
}

export function GpuBoardPreview({ configuration, locale }: GpuBoardPreviewProps) {
  const copy = translations[locale].components.gpuPreview;
  const model = buildGpuVisualModel(configuration);
  const [view, setView] = useState<GpuPreviewView>("board");
  const [selectedBoardId, setSelectedBoardId] = useState(model.metrics.hotspotModuleId);
  const [selectedDieId, setSelectedDieId] = useState(model.die.hotspotBlockId);

  const selectedModule = model.board.modules.find((module) => module.id === selectedBoardId)
    ?? model.board.modules.find((module) => module.kind === "die")
    ?? model.board.modules[0];
  const selectedBlock = model.die.blocks.find((block) => block.id === selectedDieId)
    ?? model.die.blocks.find((block) => block.id === model.die.hotspotBlockId)
    ?? model.die.blocks[0];

  const boardLegend = [
    { id: "die", label: copy.legend.die },
    { id: "vram", label: copy.legend.vram },
    { id: "vrm", label: copy.legend.vrm },
    { id: "pcie", label: copy.legend.pcie },
    { id: "display", label: copy.legend.display },
    ...(model.metrics.powerConnectors > 0
      ? [{ id: "power", label: copy.legend.power }]
      : []),
  ];
  const dieLegend = [
    { id: "compute", label: copy.legend.compute },
    { id: "cache", label: copy.legend.cache },
    { id: "memory-controller", label: copy.legend.memoryController },
    { id: "display", label: copy.legend.display },
    ...(configuration.rayTracing ? [{ id: "rt", label: copy.legend.rt }] : []),
  ];

  const stats = [
    { label: copy.metrics.dieArea, value: `${formatNumber(model.metrics.dieAreaMm2, locale)} ${copy.units.mm2}` },
    {
      label: copy.metrics.areaPerComputeUnit,
      value: `${formatDecimal(model.metrics.areaPerComputeUnit, locale, 2)} ${copy.units.mm2}`,
    },
    {
      label: copy.metrics.compute,
      value: `${formatDecimal(model.metrics.computeThroughputTflops, locale, 3)} ${copy.units.tflops}`,
    },
    {
      label: copy.metrics.bandwidth,
      value: `${formatDecimal(model.metrics.memoryBandwidthGbPerSecond, locale, 2)} ${copy.units.gbps}`,
    },
    {
      label: copy.metrics.memory,
      value: `${formatNumber(model.metrics.memoryCapacityGb, locale)} ${copy.units.gb}`,
    },
    {
      label: copy.metrics.bus,
      value: `${formatNumber(model.metrics.memoryBusBits, locale)} ${copy.units.bits}`,
    },
    { label: copy.metrics.tdp, value: `${formatNumber(model.metrics.tdpW, locale)} ${copy.units.w}` },
    { label: copy.metrics.hotspot, value: `${formatNumber(model.metrics.hotspot, locale)}/100` },
    { label: copy.metrics.vrmHeat, value: `${formatNumber(model.metrics.vrmHeat, locale)}/100` },
    { label: copy.metrics.vramHeat, value: `${formatNumber(model.metrics.vramHeat, locale)}/100` },
    {
      label: copy.metrics.boardLength,
      value: `${formatNumber(model.metrics.boardLengthMm, locale)} ${copy.units.mm}`,
    },
    { label: copy.metrics.slots, value: formatNumber(model.metrics.slotWidth, locale) },
    {
      label: copy.metrics.powerConnectors,
      value: formatNumber(model.metrics.powerConnectors, locale),
    },
    {
      label: copy.metrics.psu,
      value: `${formatNumber(model.metrics.recommendedPsuW, locale)} ${copy.units.w}`,
    },
  ];

  return (
    <section className="gpu-board-preview" aria-labelledby="gpu-board-preview-title">
      <header className="gpu-board-preview__header">
        <span className="gpu-board-preview__icon" aria-hidden="true"><Cpu size={20} /></span>
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="gpu-board-preview-title">{copy.title}</h2>
          <p>{copy.hint}</p>
        </div>
        <span className="status-pill gpu-board-preview__badge">{copy.simulationBadge}</span>
      </header>

      <div className="gpu-board-preview__layout">
        <div className="gpu-board-preview__stage">
          <div className="gpu-board-preview__toolbar">
            <div className="gpu-board-preview__toggle" role="group" aria-label={copy.viewsLabel}>
              <button
                aria-pressed={view === "board"}
                className={`button button--sm ${view === "board" ? "button--primary" : "button--ghost"}`}
                onClick={() => setView("board")}
                type="button"
              >
                <Layers3 aria-hidden="true" size={15} />
                {copy.views.board}
              </button>
              <button
                aria-pressed={view === "die"}
                className={`button button--sm ${view === "die" ? "button--primary" : "button--ghost"}`}
                onClick={() => setView("die")}
                type="button"
              >
                <Zap aria-hidden="true" size={15} />
                {copy.views.die}
              </button>
            </div>
            <span className="gpu-board-preview__view-hint">
              {view === "board" ? copy.boardHint : copy.dieHint}
            </span>
          </div>

          <div className="gpu-board-preview__canvas">
            {view === "board" ? (
              <svg
                aria-label={copy.canvasLabel}
                className="gpu-board-preview__svg"
                role="img"
                viewBox={`0 0 ${model.board.width} ${model.board.height}`}
              >
                <defs>
                  <linearGradient id="gpu-board-pcb-fill" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#10243a" />
                    <stop offset="1" stopColor="#0a1626" />
                  </linearGradient>
                  <linearGradient id="gpu-board-die-fill" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#1d4ed8" />
                    <stop offset="1" stopColor="#0f172a" />
                  </linearGradient>
                </defs>
                <rect
                  className="gpu-board__pcb"
                  fill="url(#gpu-board-pcb-fill)"
                  height={146}
                  rx={9}
                  width={316}
                  x={12}
                  y={12}
                />
                <path className="gpu-board__trace" d="M112 70H84V62H58" />
                <path className="gpu-board__trace" d="M228 70H258V62H282" />
                <path className="gpu-board__trace" d="M112 112H88V120H62" />
                <path className="gpu-board__trace" d="M228 112H254V120H280" />
                {model.board.modules.map((module) => (
                  <BoardModuleShape
                    copy={copy}
                    key={module.id}
                    locale={locale}
                    module={module}
                    onSelect={setSelectedBoardId}
                    selected={selectedModule?.id === module.id}
                  />
                ))}
                <circle
                  className="gpu-board__hotspot"
                  cx={170}
                  cy={92}
                  r={11}
                  tabIndex={-1}
                />
              </svg>
            ) : (
              <svg
                aria-label={copy.canvasLabel}
                className="gpu-board-preview__svg gpu-board-preview__svg--die"
                role="img"
                viewBox={`0 0 ${model.die.width} ${model.die.height}`}
              >
                <rect className="gpu-die__substrate" height={170} rx={10} width={280} x={10} y={10} />
                {model.die.blocks.map((block) => (
                  <DieBlockShape
                    block={block}
                    copy={copy}
                    key={block.id}
                    locale={locale}
                    onSelect={setSelectedDieId}
                    selected={selectedBlock?.id === block.id}
                  />
                ))}
                {selectedBlock && (
                  <circle
                    className="gpu-die__hotspot"
                    cx={selectedBlock.x + selectedBlock.width / 2}
                    cy={selectedBlock.y + selectedBlock.height / 2}
                    r={8}
                    tabIndex={-1}
                  />
                )}
              </svg>
            )}
          </div>

          <ul className="gpu-board-preview__legend" aria-label={copy.canvasLabel}>
            {(view === "board" ? boardLegend : dieLegend).map((item) => (
              <li key={item.id}>
                <span className={`gpu-board-preview__swatch gpu-board-preview__swatch--${item.id}`} />
                {item.label}
              </li>
            ))}
          </ul>

          <div className="gpu-board-preview__detail">
            <span className="gpu-board-preview__detail-label">{copy.selected}</span>
            {view === "board" && selectedModule ? (
              <>
                <strong>{copy.modules[selectedModule.kind]}</strong>
                <HeatBar heat={selectedModule.heat} locale={locale} />
                <dl>
                  {selectedModule.capacityGb !== undefined && (
                    <div>
                      <dt>{copy.capacity}</dt>
                      <dd>{formatNumber(selectedModule.capacityGb, locale)} {copy.units.gb}</dd>
                    </div>
                  )}
                  {selectedModule.kind === "vrm" && (
                    <div>
                      <dt>{copy.phases}</dt>
                      <dd>{formatNumber(selectedModule.count ?? 0, locale)}</dd>
                    </div>
                  )}
                  {selectedModule.kind === "display" && (
                    <div>
                      <dt>{copy.outputs}</dt>
                      <dd>{formatNumber(selectedModule.count ?? 0, locale)}</dd>
                    </div>
                  )}
                  {selectedModule.kind === "power" && (
                    <div>
                      <dt>{copy.connectors}</dt>
                      <dd>{formatNumber(selectedModule.count ?? 0, locale)}</dd>
                    </div>
                  )}
                </dl>
              </>
            ) : selectedBlock ? (
              <>
                <strong>{copy.blocks[selectedBlock.kind]}</strong>
                <HeatBar heat={selectedBlock.heat} locale={locale} />
                {selectedBlock.count !== undefined && (
                  <dl>
                    <div>
                      <dt>{copy.blocksCount}</dt>
                      <dd>{formatNumber(selectedBlock.count, locale)}</dd>
                    </div>
                  </dl>
                )}
              </>
            ) : (
              <p>{copy.noSelection}</p>
            )}
          </div>
        </div>

        <aside className="gpu-board-preview__stats" aria-label={copy.metricsLabel}>
          {stats.map((stat) => (
            <div className="gpu-board-preview__stat" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}
