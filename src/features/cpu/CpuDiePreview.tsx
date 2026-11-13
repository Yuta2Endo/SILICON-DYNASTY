import { useState, type KeyboardEvent } from "react";
import { Cpu, Flame, Grid3X3, Layers3, Thermometer, Zap } from "lucide-react";
import type { CpuConfiguration } from "../../game/models/cpu";
import {
  buildCpuDieLayout,
  getCpuDieHeatTier,
  type CpuDieBlock,
} from "../../game/models/cpu-die";
import type { Locale } from "../../game/models/game-state";
import { formatDecimal, formatNumber } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface CpuDiePreviewProps {
  configuration: CpuConfiguration;
  locale: Locale;
}

function blockShortLabel(block: CpuDieBlock): string {
  switch (block.variant) {
    case "core":
      return block.count > 1 ? `×${block.count}` : `${block.index}`;
    case "l2":
      return "L2";
    case "l3":
      return "L3";
    case "memory":
      return "MC";
    case "pcie":
      return "PCIe";
    case "display":
      return "I/O";
  }
}

export function CpuDiePreview({ configuration, locale }: CpuDiePreviewProps) {
  const copy = translations[locale].cpu.diePreview;
  const layout = buildCpuDieLayout(configuration);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const fallbackBlock = layout.blocks[0];
  if (!fallbackBlock) {
    return null;
  }
  const selectedBlock =
    layout.blocks.find((block) => block.id === selectedBlockId) ??
    layout.blocks.find((block) => block.id === layout.hotspotBlockId) ??
    fallbackBlock;

  function blockTitle(block: CpuDieBlock): string {
    switch (block.variant) {
      case "core":
        return block.count > 1
          ? `${copy.blocks.core} ×${formatNumber(block.count, locale)}`
          : `${copy.blocks.core} ${formatNumber(block.index, locale)}`;
      case "l2":
        return copy.blocks.l2;
      case "l3":
        return copy.blocks.l3;
      case "memory":
        return copy.blocks.memory;
      case "pcie":
        return copy.blocks.pcie;
      case "display":
        return copy.blocks.display;
    }
  }

  function selectBlock(block: CpuDieBlock) {
    setSelectedBlockId(block.id);
  }

  function handleBlockKeyDown(event: KeyboardEvent<SVGGElement>, block: CpuDieBlock) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectBlock(block);
    }
  }

  return (
    <section className="cpu-die-preview" aria-labelledby="cpu-die-title">
      <header className="cpu-die-preview__header">
        <div className="cpu-die-preview__intro">
          <span className="cpu-die-preview__icon" aria-hidden="true"><Cpu size={20} /></span>
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="cpu-die-title">{copy.title}</h2>
            <p>{copy.hint}</p>
          </div>
        </div>
        <span className="cpu-die-preview__badge">
          <Grid3X3 aria-hidden="true" size={14} />
          {copy.simulationBadge}
        </span>
      </header>

      <div className="cpu-die-preview__body">
        <div className="cpu-die-preview__canvas">
          <svg
            aria-label={copy.canvasLabel}
            className="cpu-die-preview__svg"
            role="img"
            viewBox={`0 0 ${layout.width} ${layout.height}`}
          >
            <defs>
              <linearGradient id="cpu-die-surface" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#10243f" />
                <stop offset="1" stopColor="#07111f" />
              </linearGradient>
              <pattern height="4" id="cpu-die-grid" patternUnits="userSpaceOnUse" width="4">
                <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#5b8fd6" strokeOpacity="0.12" strokeWidth="0.18" />
              </pattern>
            </defs>
            <rect className="cpu-die-preview__substrate" height={layout.height - 2} rx="3" width={layout.width - 2} x="1" y="1" />
            <rect fill="url(#cpu-die-grid)" height={layout.height - 2} rx="3" width={layout.width - 2} x="1" y="1" />
            {layout.blocks.map((block) => {
              const tier = getCpuDieHeatTier(block.heat);
              const isSelected = block.id === selectedBlock.id;
              const isHotspot = block.id === layout.hotspotBlockId;
              return (
                <g
                  aria-label={`${blockTitle(block)}: ${formatNumber(block.heat, locale)}/100`}
                  className={`cpu-die-block cpu-die-block--${block.kind} cpu-die-block--${tier}${isSelected ? " is-selected" : ""}`}
                  key={block.id}
                  onClick={() => selectBlock(block)}
                  onKeyDown={(event) => handleBlockKeyDown(event, block)}
                  role="button"
                  tabIndex={0}
                >
                  <rect
                    className="cpu-die-block__shape"
                    height={block.height}
                    rx={block.kind === "core" ? 0.9 : 1.3}
                    width={block.width}
                    x={block.x}
                    y={block.y}
                  />
                  <text
                    className="cpu-die-block__label"
                    fontSize={block.width < 6 ? 1.7 : 2.3}
                    textAnchor="middle"
                    x={block.x + block.width / 2}
                    y={block.y + block.height / 2 + 0.7}
                  >
                    {blockShortLabel(block)}
                  </text>
                  {tier === "hot" && (
                    <circle
                      aria-hidden="true"
                      className="cpu-die-block__hotspot"
                      cx={block.x + block.width / 2}
                      cy={block.y + block.height / 2}
                      r={Math.min(block.width, block.height) * (isHotspot ? 0.42 : 0.28)}
                    />
                  )}
                  {isHotspot && (
                    <circle
                      aria-hidden="true"
                      className="cpu-die-block__hotspot-ring"
                      cx={block.x + block.width / 2}
                      cy={block.y + block.height / 2}
                      r={Math.min(block.width, block.height) * 0.52}
                    />
                  )}
                </g>
              );
            })}
          </svg>
          <p className="cpu-die-preview__note">{copy.simulationNote}</p>
        </div>

        <div className="cpu-die-preview__side">
          <div className="cpu-die-preview__stats">
            <div>
              <span><Layers3 aria-hidden="true" size={14} />{copy.metrics.dieArea}</span>
              <strong>{formatDecimal(layout.dieAreaMm2, locale, 1)} {copy.units.mm2}</strong>
            </div>
            <div>
              <span><Grid3X3 aria-hidden="true" size={14} />{copy.metrics.areaPerCore}</span>
              <strong>{formatDecimal(layout.areaPerCoreMm2, locale, 2)} {copy.units.mm2}</strong>
            </div>
            <div>
              <span><Zap aria-hidden="true" size={14} />{copy.metrics.thermalDensity}</span>
              <strong>{formatDecimal(layout.thermalDensityWPerMm2, locale, 3)} {copy.units.wPerMm2}</strong>
            </div>
            <div>
              <span><Flame aria-hidden="true" size={14} />{copy.metrics.hotspot}</span>
              <strong>{formatNumber(layout.hotspot, locale)}/100</strong>
            </div>
            <div>
              <span><Thermometer aria-hidden="true" size={14} />{copy.metrics.cacheShare}</span>
              <strong>{formatDecimal(layout.cacheSharePercent, locale, 1)}%</strong>
            </div>
            <div>
              <span><Layers3 aria-hidden="true" size={14} />{copy.metrics.blocks}</span>
              <strong>{formatNumber(layout.blocks.length, locale)}</strong>
            </div>
          </div>

          <div className="cpu-die-preview__selected">
            <p className="eyebrow">{copy.selected}</p>
            <strong>{blockTitle(selectedBlock)}</strong>
            <span>{copy.heat}: {formatNumber(selectedBlock.heat, locale)}/100</span>
            {selectedBlock.count > 1 && selectedBlock.variant === "core" && (
              <span>{copy.cores}: {formatNumber(selectedBlock.count, locale)}</span>
            )}
          </div>

          <div className="cpu-die-preview__legend" aria-label={copy.legend}>
            <span><i className="cpu-die-legend cpu-die-legend--core" />{copy.legendCore}</span>
            <span><i className="cpu-die-legend cpu-die-legend--cache" />{copy.legendCache}</span>
            <span><i className="cpu-die-legend cpu-die-legend--io" />{copy.legendIo}</span>
            <span><i className="cpu-die-legend cpu-die-legend--hot" />{copy.legendHotspot}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
