# Analytics

## Scope

Analytics is a read-only reporting layer over the current campaign. It does not change the simulation, balance, save schema or daily pipeline. Every value is derived from existing finance records, market summaries, research state and product projects.

The report is available as the third tab of the Market/Finance workspace. The primary bottom navigation remains six destinations.

## Data sources

- `finance.dailyRecords` — up to 365 daily records with revenue, cost categories, profit, cash flow, units and closing balance.
- `finance.transactions` and lifetime totals — used for the corporate report.
- `market.dailySummaries` — up to 180 days of player units, total demand, revenue, component sales and per-segment results.
- `market.products`, `market.componentProducts` and `market.actions` — active products, top products and competitor activity.
- `research` — completed technologies, active project and total R&D investment.
- CPU, component, OS, AI, device and cloud projects — project/version counts, OS releases and AI deployments.

## Report periods

The report supports 7, 30 and 90 days. A record is included when its date is on or after `gameDate - rangeDays`. The date range shown in the header is the first and last finance record in the selection, not the requested calendar window.

## Corporate report

- Period revenue is the sum of `revenueUsd`.
- Period expenses sum manufacturing, payroll, overhead, marketing, research, release, interest and tax.
- Net profit is the sum of `netProfitUsd`.
- Net margin is `netProfit / revenue` when revenue is positive.
- Average daily revenue and profit divide by the number of finance records in the period.
- Daily operating cost is the latest record's payroll + overhead + marketing + interest.
- Cash runway is `floor(balance / dailyOperatingCost)` when operating cost is positive.
- Debt is the current loan principal.
- Lifetime revenue, expenses, taxes, interest and financing come from the finance state.

## Market report

- Player units and demand are summed across the selected market summaries.
- Market share is `playerUnits / totalDemandUnits`.
- Component units, component demand and component revenue are summed from the same summaries.
- Segment rows aggregate player and total units per segment across the period.
- The best day is the summary with the highest `playerRevenueUsd`.
- Top products combine CPU and component products, sorted by lifetime product revenue and limited to five.
- Competitor actions are counted by date in the selected period.

## Technology report

- Completed research count and total R&D investment come from the research state.
- Active research shows progress days against the catalog duration.
- Project counts and saved version counts cover all six product domains.
- OS release and AI deployment counts are summed across their projects.

## CSV export

The export contains the selected daily points with the stable header:

```text
date,revenue_usd,expenses_usd,net_profit_usd,units_sold,market_share
```

Values use two decimal places for money and six for market share. The file is generated locally with a Blob download; no server is involved.

## UI and accessibility

- Range buttons expose `aria-pressed`.
- The revenue/expense chart is an accessible SVG with `role="img"`, title, description, axis labels and a legend.
- Empty finance history shows an explicit empty state instead of a blank chart.
- All monetary values use the shared currency formatter; dates use the shared game-date formatter.
- RU/EN copy is kept structurally identical.

## Tests

- `src/game/formulas/analytics.test.ts` — range filtering, corporate totals, market aggregation, segment totals, project counts and CSV.
- `src/features/analytics/AnalyticsPanel.test.tsx` — rendered sections, range switching, CSV download and empty state.
- `src/features/market/MarketPage.test.tsx` — Analytics tab integration.
- `src/app/App.test.tsx` — navigation from Market to Analytics.

No dependency was added; the chart uses SVG/CSS rather than ECharts.
