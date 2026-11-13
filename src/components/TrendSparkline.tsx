interface TrendSparklineProps {
  values: readonly number[];
  label: string;
  tone?: "blue" | "green" | "violet" | "amber" | "danger";
}

const WIDTH = 132;
const HEIGHT = 42;
const PADDING = 4;

export function TrendSparkline({ values, label, tone = "blue" }: TrendSparklineProps) {
  if (values.length === 0) {
    return null;
  }

  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? (WIDTH - PADDING * 2) / (values.length - 1) : 0;
  const points = values.map((value, index) => {
    const x = PADDING + index * step;
    const y = PADDING + (1 - (value - min) / span) * (HEIGHT - PADDING * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = points.join(" ");
  const baselineY = PADDING + (1 - (0 - min) / span) * (HEIGHT - PADDING * 2);
  const area = `${PADDING},${baselineY.toFixed(1)} ${line} ${(PADDING + (values.length - 1) * step).toFixed(1)},${baselineY.toFixed(1)}`;

  return (
    <svg
      aria-label={label}
      className={`trend-sparkline trend-sparkline--${tone}`}
      role="img"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    >
      <title>{label}</title>
      {min < 0 && (
        <line
          className="trend-sparkline__baseline"
          x1={PADDING}
          x2={WIDTH - PADDING}
          y1={baselineY}
          y2={baselineY}
        />
      )}
      <polygon className="trend-sparkline__area" points={area} />
      <polyline className="trend-sparkline__line" points={line} />
    </svg>
  );
}
