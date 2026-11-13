import { useState, type FormEvent } from "react";
import {
  Banknote,
  Boxes,
  CircleDollarSign,
  Factory,
  HandCoins,
  History,
  Landmark,
  Megaphone,
  Package,
  Percent,
  Receipt,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { GameState } from "../../game/models/game-state";
import { validateComponentName } from "../../game/models/components";
import {
  COMPETITORS,
  MARKET_LIMITS,
  MARKET_RULES,
  MARKET_SEGMENTS,
  getMarketSegment,
  validateProductName,
  type ComponentMarketProduct,
  type MarketProduct,
  type MarketSegmentId,
  type ProductionOrder,
} from "../../game/models/market";
import {
  type FinanceDailyRecord,
} from "../../game/models/finance";
import {
  calculateCpuMarketPerformanceScore,
  calculateGrossMargin,
  calculateSuggestedPrice,
  estimateManufacturingCost,
  getSegmentDailyDemand,
} from "../../game/formulas/market";
import {
  calculateComponentPerformanceScore,
  calculateSuggestedComponentPrice,
  estimateComponentManufacturingCost,
  getComponentMarketProfile,
} from "../../game/formulas/components";
import { estimateProductDailyDemand } from "../../game/engine/market";
import {
  estimateComponentProductDailyDemand,
  type ReleaseComponentProductInput,
} from "../../game/engine/component-market";
import { getLoanDailyInterest, getRemainingLoanCapacity } from "../../game/engine/finance";
import type { ReleaseProductInput } from "../../game/engine/market";
import {
  formatCurrency,
  formatDecimal,
  formatNumber,
  formatShortGameDate,
} from "../../localization/formatters";
import { translations, type TranslationMessages } from "../../localization/messages";
import { MetricCard } from "../../components/MetricCard";

export type MarketView = "market" | "finance";
type MarketCopy = TranslationMessages["market"];
type FinanceCopy = MarketCopy["finance"];
const DEFAULT_MARKET_SEGMENT = MARKET_SEGMENTS[0]!;

interface MarketPageProps {
  state: GameState;
  isSaving: boolean;
  activeView: MarketView;
  onViewChange: (view: MarketView) => void;
  onReleaseProduct: (input: ReleaseProductInput) => Promise<boolean>;
  onReleaseComponentProduct: (input: ReleaseComponentProductInput) => Promise<boolean>;
  onUpdatePrice: (productId: string, priceUsd: number) => Promise<boolean>;
  onUpdateComponentPrice: (productId: string, priceUsd: number) => Promise<boolean>;
  onOrderProduction: (productId: string, quantity: number) => Promise<boolean>;
  onDiscontinueProduct: (productId: string) => Promise<boolean>;
  onDiscontinueComponentProduct: (productId: string) => Promise<boolean>;
  onUpdateMarketingBudget: (amountUsd: number) => Promise<boolean>;
  onTakeLoan: (amountUsd: number) => Promise<boolean>;
  onRepayLoan: (amountUsd: number) => Promise<boolean>;
}

export function MarketPage({
  state,
  isSaving,
  activeView,
  onViewChange,
  onReleaseProduct,
  onReleaseComponentProduct,
  onUpdatePrice,
  onUpdateComponentPrice,
  onOrderProduction,
  onDiscontinueProduct,
  onDiscontinueComponentProduct,
  onUpdateMarketingBudget,
  onTakeLoan,
  onRepayLoan,
}: MarketPageProps) {
  const copy = translations[state.settings.locale].market;

  return (
    <div className="page-stack market-page">
      <div className="market-tabs" role="tablist" aria-label={copy.tabs}>
        <button
          aria-controls="market-panel"
          aria-selected={activeView === "market"}
          className={`segment-button${activeView === "market" ? " is-selected" : ""}`}
          id="market-tab"
          onClick={() => onViewChange("market")}
          role="tab"
          type="button"
        >
          <Store aria-hidden="true" size={16} />
          {copy.tabMarket}
        </button>
        <button
          aria-controls="market-panel"
          aria-selected={activeView === "finance"}
          className={`segment-button${activeView === "finance" ? " is-selected" : ""}`}
          id="finance-tab"
          onClick={() => onViewChange("finance")}
          role="tab"
          type="button"
        >
          <Landmark aria-hidden="true" size={16} />
          {copy.tabFinance}
        </button>
      </div>

      <div
        aria-labelledby={activeView === "market" ? "market-tab" : "finance-tab"}
        id="market-panel"
        role="tabpanel"
      >
        {activeView === "market" ? (
          <MarketOverview
            copy={copy}
            isSaving={isSaving}
            onDiscontinueProduct={onDiscontinueProduct}
            onDiscontinueComponentProduct={onDiscontinueComponentProduct}
            onOrderProduction={onOrderProduction}
            onReleaseProduct={onReleaseProduct}
            onReleaseComponentProduct={onReleaseComponentProduct}
            onUpdatePrice={onUpdatePrice}
            onUpdateComponentPrice={onUpdateComponentPrice}
            state={state}
          />
        ) : (
          <FinanceOverview
            copy={copy.finance}
            isSaving={isSaving}
            marketCopy={copy}
            onRepayLoan={onRepayLoan}
            onTakeLoan={onTakeLoan}
            onUpdateMarketingBudget={onUpdateMarketingBudget}
            state={state}
          />
        )}
      </div>
    </div>
  );
}

function MarketOverview({
  state,
  copy,
  isSaving,
  onReleaseProduct,
  onReleaseComponentProduct,
  onUpdatePrice,
  onUpdateComponentPrice,
  onOrderProduction,
  onDiscontinueProduct,
  onDiscontinueComponentProduct,
}: {
  state: GameState;
  copy: MarketCopy;
  isSaving: boolean;
  onReleaseProduct: (input: ReleaseProductInput) => Promise<boolean>;
  onReleaseComponentProduct: (input: ReleaseComponentProductInput) => Promise<boolean>;
  onUpdatePrice: (productId: string, priceUsd: number) => Promise<boolean>;
  onUpdateComponentPrice: (productId: string, priceUsd: number) => Promise<boolean>;
  onOrderProduction: (productId: string, quantity: number) => Promise<boolean>;
  onDiscontinueProduct: (productId: string) => Promise<boolean>;
  onDiscontinueComponentProduct: (productId: string) => Promise<boolean>;
}) {
  const locale = state.settings.locale;
  const latest = state.market.dailySummaries.at(-1);
  const activeProducts = state.market.products.filter((product) => product.status === "active");

  return (
    <div className="page-stack">
      <section className="metrics-grid" aria-label={copy.overview}>
        <MetricCard
          accent="blue"
          detail={copy.shareHint}
          icon={TrendingUp}
          label={copy.share}
          value={formatShare(latest?.marketShare ?? 0, locale)}
        />
        <MetricCard
          accent="green"
          detail={copy.dailySalesHint}
          icon={ShoppingCart}
          label={copy.dailySales}
          value={formatNumber(latest?.playerUnits ?? 0, locale)}
        />
        <MetricCard
          accent="violet"
          detail={copy.dailyRevenueHint}
          icon={CircleDollarSign}
          label={copy.dailyRevenue}
          value={formatCurrency(latest?.playerRevenueUsd ?? 0, locale)}
        />
        <MetricCard
          accent="amber"
          detail={copy.activeProductsHint}
          icon={Package}
          label={copy.activeProducts}
          value={formatNumber(activeProducts.length, locale)}
        />
      </section>

      <ReleaseProductForm
        copy={copy}
        isSaving={isSaving}
        onReleaseProduct={onReleaseProduct}
        state={state}
      />

      <section className="market-section" aria-labelledby="market-products-title">
        <SectionHeading
          copy={copy.products.hint}
          icon={Boxes}
          id="market-products-title"
          title={copy.products.title}
        />
        {state.market.products.length === 0 ? (
          <EmptyState body={copy.emptyProductsHint} title={copy.emptyProducts} />
        ) : (
          <div className="market-product-list">
            {state.market.products.map((product) => (
              <ProductCard
                copy={copy}
                isSaving={isSaving}
                key={product.id}
                onDiscontinue={onDiscontinueProduct}
                onOrderProduction={onOrderProduction}
                onUpdatePrice={onUpdatePrice}
                product={product}
                state={state}
              />
            ))}
          </div>
        )}
      </section>

      <ComponentMarketSection
        copy={copy}
        isSaving={isSaving}
        onDiscontinueComponentProduct={onDiscontinueComponentProduct}
        onReleaseComponentProduct={onReleaseComponentProduct}
        onUpdateComponentPrice={onUpdateComponentPrice}
        state={state}
      />

      <section className="market-section" aria-labelledby="market-orders-title">
        <SectionHeading
          copy={copy.orders.hint}
          icon={Factory}
          id="market-orders-title"
          title={copy.orders.title}
        />
        <ProductionOrders
          copy={copy}
          locale={locale}
          orders={state.market.productionOrders}
          products={state.market.products}
        />
      </section>

      <section className="market-section" aria-labelledby="market-segments-title">
        <SectionHeading
          copy={copy.segments.hint}
          icon={Percent}
          id="market-segments-title"
          title={copy.segments.title}
        />
        <div className="market-segment-grid">
          {MARKET_SEGMENTS.map((segment) => {
            const result = latest?.segments[segment.id];
            return (
              <article className="market-segment-card" key={segment.id}>
                <div className="market-segment-card__topline">
                  <h3>{copy.segmentNames[segment.id]}</h3>
                  <span className="status-pill">{formatNumber(getSegmentDailyDemand(segment, state.gameDate), locale)}</span>
                </div>
                <dl className="market-data-list">
                  <div>
                    <dt>{copy.segments.demand}</dt>
                    <dd>{formatNumber(getSegmentDailyDemand(segment, state.gameDate), locale)}</dd>
                  </div>
                  <div>
                    <dt>{copy.segments.referencePrice}</dt>
                    <dd>{formatCurrency(segment.referencePriceUsd, locale)}</dd>
                  </div>
                  <div>
                    <dt>{copy.segments.playerShare}</dt>
                    <dd>{formatShare(result?.share ?? 0, locale)}</dd>
                  </div>
                  <div>
                    <dt>{copy.segments.sold}</dt>
                    <dd>{result ? formatNumber(result.playerUnits, locale) : copy.segments.noSales}</dd>
                  </div>
                </dl>
                <p className="market-segment-card__growth">
                  {copy.segments.growth}: {formatDecimal(segment.annualGrowthRate * 100, locale, 1)}%
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="market-section" aria-labelledby="market-competitors-title">
        <SectionHeading
          copy={copy.competitors.hint}
          icon={Trophy}
          id="market-competitors-title"
          title={copy.competitors.title}
        />
        <div className="market-competitor-grid">
          {COMPETITORS.map((definition) => {
            const competitorState = state.market.competitors.find(
              (candidate) => candidate.competitorId === definition.id,
            );
            const latestAction = state.market.actions.find(
              (action) => action.competitorId === definition.id,
            );
            if (!competitorState) {
              return null;
            }
            return (
              <article className="market-competitor-card" key={definition.id}>
                <div className="market-competitor-card__topline">
                  <h3>{definition.name}</h3>
                  <span className="status-pill">{copy.strategies[definition.strategy]}</span>
                </div>
                <p className="market-competitor-card__strategy">{copy.competitors.strategy}: {copy.strategies[definition.strategy]}</p>
                <dl className="market-data-list">
                  <div>
                    <dt>{copy.competitors.priceIndex}</dt>
                    <dd>{formatDecimal(competitorState.priceMultiplier, locale, 3)}</dd>
                  </div>
                  <div>
                    <dt>{copy.competitors.performanceIndex}</dt>
                    <dd>{formatDecimal(competitorState.performanceMultiplier, locale, 3)}</dd>
                  </div>
                  <div>
                    <dt>{copy.competitors.marketingIndex}</dt>
                    <dd>{formatDecimal(competitorState.marketingMultiplier, locale, 3)}</dd>
                  </div>
                  <div>
                    <dt>{copy.competitors.nextAction}</dt>
                    <dd>{formatShortGameDate(competitorState.nextActionOn, locale)}</dd>
                  </div>
                </dl>
                <p className="market-competitor-card__action">
                  <strong>{copy.competitors.recentAction}:</strong>{" "}
                  {latestAction
                    ? `${copy.actions[latestAction.type]} · ${copy.actions.value.replace(
                      "{percent}",
                      formatDecimal(latestAction.valuePercent, locale, 1),
                    )} · ${formatShortGameDate(latestAction.date, locale)}`
                    : copy.competitors.noActions}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="market-section" aria-labelledby="market-history-title">
        <SectionHeading
          copy={copy.history.hint}
          icon={History}
          id="market-history-title"
          title={copy.history.title}
        />
        {state.market.dailySummaries.length === 0 ? (
          <EmptyState body={copy.history.empty} title={copy.history.title} />
        ) : (
          <div className="market-history-list">
            {[...state.market.dailySummaries].reverse().slice(0, 8).map((summary) => (
              <article className="market-history-row" key={summary.date}>
                <strong>{formatShortGameDate(summary.date, locale)}</strong>
                <span>{copy.history.demand}: {formatNumber(summary.totalDemandUnits, locale)}</span>
                <span>{copy.history.sold}: {formatNumber(summary.playerUnits, locale)}</span>
                <span>{copy.history.revenue}: {formatCurrency(summary.playerRevenueUsd, locale)}</span>
                <span>{copy.history.share}: {formatShare(summary.marketShare, locale)}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ComponentMarketSection({
  state,
  copy,
  isSaving,
  onReleaseComponentProduct,
  onUpdateComponentPrice,
  onDiscontinueComponentProduct,
}: {
  state: GameState;
  copy: MarketCopy;
  isSaving: boolean;
  onReleaseComponentProduct: (input: ReleaseComponentProductInput) => Promise<boolean>;
  onUpdateComponentPrice: (productId: string, priceUsd: number) => Promise<boolean>;
  onDiscontinueComponentProduct: (productId: string) => Promise<boolean>;
}) {
  const locale = state.settings.locale;
  const componentCopy = copy.componentMarket;
  const latest = state.market.dailySummaries.at(-1);
  const activeProducts = state.market.componentProducts.filter((product) => product.status === "active");

  return (
    <section className="market-section component-market-section" aria-labelledby="component-market-title">
      <SectionHeading
        copy={componentCopy.hint}
        icon={Boxes}
        id="component-market-title"
        title={componentCopy.title}
      />
      <div className="market-release-summary component-market-summary">
        <SummaryStat label={componentCopy.dailyDemand} value={formatNumber(latest?.componentDemandUnits ?? 0, locale)} />
        <SummaryStat label={componentCopy.dailyUnits} value={formatNumber(latest?.componentUnits ?? 0, locale)} />
        <SummaryStat label={componentCopy.dailyRevenue} value={formatCurrency(latest?.componentRevenueUsd ?? 0, locale)} />
        <SummaryStat label={componentCopy.activeProducts} value={formatNumber(activeProducts.length, locale)} />
      </div>

      <ComponentReleaseForm
        copy={copy}
        isSaving={isSaving}
        onReleaseComponentProduct={onReleaseComponentProduct}
        state={state}
      />

      {state.market.componentProducts.length === 0 ? (
        <EmptyState body={componentCopy.emptyHint} title={componentCopy.emptyTitle} />
      ) : (
        <div className="market-product-list">
          {state.market.componentProducts.map((product) => (
            <ComponentProductCard
              copy={copy}
              isSaving={isSaving}
              key={product.id}
              onDiscontinue={onDiscontinueComponentProduct}
              onUpdatePrice={onUpdateComponentPrice}
              product={product}
              state={state}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ComponentReleaseForm({
  state,
  copy,
  isSaving,
  onReleaseComponentProduct,
}: {
  state: GameState;
  copy: MarketCopy;
  isSaving: boolean;
  onReleaseComponentProduct: (input: ReleaseComponentProductInput) => Promise<boolean>;
}) {
  const formCopy = copy.componentMarket.release;
  const firstProject = state.componentProjects[0];
  const firstVersion = firstProject?.versions.at(-1);
  const [projectId, setProjectId] = useState(firstProject?.id ?? "");
  const [versionNumber, setVersionNumber] = useState(firstVersion?.version ?? 0);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(() => {
    if (!firstVersion) {
      return "250";
    }
    const cost = estimateComponentManufacturingCost(firstVersion.configuration).unitCostUsd;
    return String(calculateSuggestedComponentPrice(
      cost,
      getComponentMarketProfile(firstVersion.configuration.type),
    ));
  });
  const [error, setError] = useState<string | null>(null);

  const selectedProject = state.componentProjects.find((project) => project.id === projectId) ?? firstProject;
  const selectedVersion = selectedProject?.versions.find((version) => version.version === versionNumber)
    ?? selectedProject?.versions.at(-1);
  const estimate = selectedVersion ? estimateComponentManufacturingCost(selectedVersion.configuration) : null;
  const performance = selectedVersion
    ? calculateComponentPerformanceScore(selectedVersion.configuration)
    : null;
  const suggestedPrice = estimate && selectedVersion
    ? calculateSuggestedComponentPrice(
      estimate.unitCostUsd,
      getComponentMarketProfile(selectedVersion.configuration.type),
    )
    : null;
  const priceNumber = Number(price);
  const invalidPrice = !Number.isFinite(priceNumber)
    || priceNumber < MARKET_LIMITS.minPriceUsd
    || priceNumber > MARKET_LIMITS.maxPriceUsd;
  const margin = estimate && Number.isFinite(priceNumber)
    ? (priceNumber - estimate.unitCostUsd) / priceNumber
    : 0;

  if (state.componentProjects.length === 0) {
    return (
      <div className="component-market-empty">
        <p>{formCopy.noProjects}</p>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) {
      setError(formCopy.errors.project);
      return;
    }
    if (!selectedVersion) {
      setError(formCopy.errors.version);
      return;
    }
    if (validateComponentName(name.trim()) !== null) {
      setError(formCopy.errors.name);
      return;
    }
    if (invalidPrice) {
      setError(formCopy.errors.price);
      return;
    }
    if (state.company.balance < MARKET_RULES.launchFeeUsd) {
      setError(formCopy.errors.funds);
      return;
    }

    setError(null);
    const succeeded = await onReleaseComponentProduct({
      projectId: selectedProject.id,
      projectVersion: selectedVersion.version,
      name: name.trim(),
      priceUsd: priceNumber,
    });
    if (succeeded) {
      setName("");
    }
  }

  return (
    <div className="component-release-block">
      <div>
        <h3>{formCopy.title}</h3>
        <p>{formCopy.hint}</p>
      </div>
      <form className="market-form-card" onSubmit={(event) => void handleSubmit(event)}>
        <div className="market-form-grid">
          <div className="field-group">
            <label htmlFor="component-release-project">{formCopy.project}</label>
            <select
              id="component-release-project"
              onChange={(event) => {
                const nextProject = state.componentProjects.find((project) => project.id === event.target.value);
                const nextVersion = nextProject?.versions.at(-1);
                setProjectId(event.target.value);
                setVersionNumber(nextVersion?.version ?? 0);
                if (nextVersion) {
                  const nextCost = estimateComponentManufacturingCost(nextVersion.configuration).unitCostUsd;
                  setPrice(String(calculateSuggestedComponentPrice(
                    nextCost,
                    getComponentMarketProfile(nextVersion.configuration.type),
                  )));
                }
              }}
              value={selectedProject?.id ?? ""}
            >
              {state.componentProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {copy.componentMarket.types[project.type]} · {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="component-release-version">{copy.release.version}</label>
            <select
              id="component-release-version"
              onChange={(event) => setVersionNumber(Number(event.target.value))}
              value={selectedVersion?.version ?? ""}
            >
              {selectedProject?.versions.map((version) => (
                <option key={version.version} value={version.version}>
                  {copy.release.version} {version.version} · {formatShortGameDate(version.savedOn, state.settings.locale)}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="component-release-name">{formCopy.name}</label>
            <input
              id="component-release-name"
              maxLength={MARKET_LIMITS.maxProductNameLength}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dynasty Graphics 100"
              value={name}
            />
            <p className="field-hint">{formCopy.nameHint}</p>
          </div>
          <div className="field-group">
            <label htmlFor="component-release-price">{formCopy.price}</label>
            <input
              id="component-release-price"
              inputMode="decimal"
              min={MARKET_LIMITS.minPriceUsd}
              onChange={(event) => setPrice(event.target.value)}
              step="1"
              type="number"
              value={price}
            />
            <p className="field-hint">{formCopy.priceHint}</p>
          </div>
          <div className="field-group market-suggested-price">
            <span>{copy.release.suggested}</span>
            <strong>{suggestedPrice === null ? "—" : formatCurrency(suggestedPrice, state.settings.locale)}</strong>
            <button
              className="button button--secondary"
              disabled={suggestedPrice === null || isSaving}
              onClick={() => suggestedPrice !== null && setPrice(String(suggestedPrice))}
              type="button"
            >
              {copy.release.useSuggested}
            </button>
          </div>
        </div>

        <div className="market-release-summary">
          <SummaryStat label={formCopy.unitCost} value={estimate ? formatCurrency(estimate.unitCostUsd, state.settings.locale) : "—"} />
          <SummaryStat label={formCopy.performance} value={performance === null ? "—" : formatDecimal(performance, state.settings.locale, 2)} />
          <SummaryStat label={copy.release.margin} value={formatShare(margin, state.settings.locale)} />
          <SummaryStat label={copy.release.launchFee} value={formatCurrency(MARKET_RULES.launchFeeUsd, state.settings.locale)} />
        </div>

        {error && <p className="inline-feedback inline-feedback--error" role="alert">{error}</p>}

        <div className="market-form-footer">
          <p className="field-hint">{formCopy.marginNote}</p>
          <button className="button button--primary" disabled={isSaving} type="submit">
            {isSaving ? copy.release.submitting : formCopy.submit}
          </button>
        </div>
      </form>
    </div>
  );
}

function ComponentProductCard({
  product,
  state,
  copy,
  isSaving,
  onUpdatePrice,
  onDiscontinue,
}: {
  product: ComponentMarketProduct;
  state: GameState;
  copy: MarketCopy;
  isSaving: boolean;
  onUpdatePrice: (productId: string, priceUsd: number) => Promise<boolean>;
  onDiscontinue: (productId: string) => Promise<boolean>;
}) {
  const locale = state.settings.locale;
  const productCopy = copy.componentMarket.products;
  const [price, setPrice] = useState(String(product.priceUsd));
  const [error, setError] = useState<string | null>(null);
  const priceNumber = Number(price);
  const invalidPrice = !Number.isFinite(priceNumber)
    || priceNumber < MARKET_LIMITS.minPriceUsd
    || priceNumber > MARKET_LIMITS.maxPriceUsd;
  const estimate = product.status === "active"
    ? estimateComponentProductDailyDemand(state, product.id, state.gameDate)
    : null;

  async function updatePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidPrice) {
      setError(copy.release.errors.price);
      return;
    }
    setError(null);
    await onUpdatePrice(product.id, priceNumber);
  }

  return (
    <article className={`market-product-card component-product-card${product.status === "discontinued" ? " is-discontinued" : ""}`}>
      <div className="market-product-card__header">
        <div>
          <div className="market-product-card__titleline">
            <h3>{product.name}</h3>
            <span className={`market-status market-status--${product.status}`}>
              {product.status === "active" ? copy.products.active : copy.products.discontinued}
            </span>
          </div>
          <p>
            {copy.componentMarket.types[product.componentType]} · v{product.projectVersion} ·{" "}
            {formatShortGameDate(product.releaseDate, locale)}
          </p>
        </div>
        <strong>{formatCurrency(product.priceUsd, locale)}</strong>
      </div>

      <div className="market-product-stats">
        <SummaryStat label={copy.products.unitCost} value={formatCurrency(product.manufacturingCostUsd, locale)} />
        <SummaryStat
          label={copy.products.margin}
          value={formatShare((product.priceUsd - product.manufacturingCostUsd) / product.priceUsd, locale)}
        />
        <SummaryStat label={productCopy.performance} value={formatDecimal(product.performanceScore, locale, 3)} />
        <SummaryStat label={copy.products.sold} value={formatNumber(product.unitsSold, locale)} />
        <SummaryStat label={copy.products.revenue} value={formatCurrency(product.revenueUsd, locale)} />
        <SummaryStat
          label={productCopy.estimate}
          value={estimate
            ? productCopy.estUnits.replace("{units}", formatNumber(estimate.unitsPerDay, locale))
            : copy.products.estimateUnavailable}
        />
      </div>

      {estimate && (
        <p className="market-product-card__estimate">
          {productCopy.estShare.replace("{share}", formatShare(estimate.share, locale))}
        </p>
      )}

      {product.status === "active" && (
        <>
          <div className="market-product-actions">
            <form className="market-inline-form" onSubmit={(event) => void updatePrice(event)}>
              <div className="field-group">
                <label htmlFor={`component-price-${product.id}`}>{copy.products.price}</label>
                <input
                  id={`component-price-${product.id}`}
                  inputMode="decimal"
                  min={MARKET_LIMITS.minPriceUsd}
                  onChange={(event) => setPrice(event.target.value)}
                  step="1"
                  type="number"
                  value={price}
                />
              </div>
              <button className="button button--secondary" disabled={isSaving || invalidPrice} type="submit">
                {copy.products.applyPrice}
              </button>
            </form>
          </div>
          {error && <p className="field-error">{error}</p>}
          <button
            className="button button--danger market-discontinue-button"
            disabled={isSaving}
            onClick={() => void onDiscontinue(product.id)}
            type="button"
          >
            {isSaving ? copy.products.discontinuing : copy.products.discontinue}
          </button>
        </>
      )}
    </article>
  );
}

function ReleaseProductForm({
  state,
  copy,
  isSaving,
  onReleaseProduct,
}: {
  state: GameState;
  copy: MarketCopy;
  isSaving: boolean;
  onReleaseProduct: (input: ReleaseProductInput) => Promise<boolean>;
}) {
  const firstProject = state.cpuProjects[0];
  const firstVersion = firstProject?.versions.at(-1);
  const [projectId, setProjectId] = useState(firstProject?.id ?? "");
  const [versionNumber, setVersionNumber] = useState(firstVersion?.version ?? 0);
  const [segmentId, setSegmentId] = useState<MarketSegmentId>("budget");
  const [name, setName] = useState("");
  const [price, setPrice] = useState(() => {
    if (!firstVersion) {
      return "300";
    }
    const cost = estimateManufacturingCost(firstVersion.configuration).unitCostUsd;
    return String(calculateSuggestedPrice(cost, DEFAULT_MARKET_SEGMENT));
  });
  const [error, setError] = useState<string | null>(null);

  const selectedProject = state.cpuProjects.find((project) => project.id === projectId) ?? firstProject;
  const selectedVersion = selectedProject?.versions.find((version) => version.version === versionNumber)
    ?? selectedProject?.versions.at(-1);
  const segment = getMarketSegment(segmentId) ?? DEFAULT_MARKET_SEGMENT;
  const estimate = selectedVersion ? estimateManufacturingCost(selectedVersion.configuration) : null;
  const performance = selectedVersion
    ? calculateCpuMarketPerformanceScore(selectedVersion.configuration)
    : null;
  const suggestedPrice = estimate
    ? calculateSuggestedPrice(estimate.unitCostUsd, segment)
    : null;
  const priceNumber = Number(price);
  const margin = estimate && Number.isFinite(priceNumber)
    ? calculateGrossMargin(priceNumber, estimate.unitCostUsd)
    : 0;

  if (state.cpuProjects.length === 0) {
    return (
      <section className="market-section" aria-labelledby="market-release-title">
        <SectionHeading
          copy={copy.release.description}
          icon={Sparkles}
          id="market-release-title"
          title={copy.release.title}
        />
        <EmptyState body={copy.release.noProjects} title={copy.release.eyebrow} />
      </section>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!selectedProject) {
      setError(copy.release.errors.project);
      return;
    }
    if (!selectedVersion) {
      setError(copy.release.errors.version);
      return;
    }
    if (!validateProductName(trimmedName)) {
      setError(copy.release.errors.name);
      return;
    }
    if (
      !Number.isFinite(priceNumber)
      || priceNumber < MARKET_LIMITS.minPriceUsd
      || priceNumber > MARKET_LIMITS.maxPriceUsd
    ) {
      setError(copy.release.errors.price);
      return;
    }
    if (state.company.balance < MARKET_RULES.launchFeeUsd) {
      setError(copy.release.errors.funds);
      return;
    }

    setError(null);
    const succeeded = await onReleaseProduct({
      projectId: selectedProject.id,
      projectVersion: selectedVersion.version,
      name: trimmedName,
      segmentId,
      priceUsd: priceNumber,
    });
    if (succeeded) {
      setName("");
    }
  }

  return (
    <section className="market-section" aria-labelledby="market-release-title">
      <SectionHeading
        copy={copy.release.description}
        icon={Sparkles}
        id="market-release-title"
        title={copy.release.title}
      />
      <form className="market-form-card" onSubmit={(event) => void handleSubmit(event)}>
        <div className="market-form-grid">
          <div className="field-group">
            <label htmlFor="market-release-project">{copy.release.project}</label>
            <select
              id="market-release-project"
              onChange={(event) => {
                const nextProject = state.cpuProjects.find((project) => project.id === event.target.value);
                setProjectId(event.target.value);
                setVersionNumber(nextProject?.versions.at(-1)?.version ?? 0);
              }}
              value={selectedProject?.id ?? ""}
            >
              {state.cpuProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="market-release-version">{copy.release.version}</label>
            <select
              id="market-release-version"
              onChange={(event) => setVersionNumber(Number(event.target.value))}
              value={selectedVersion?.version ?? ""}
            >
              {selectedProject?.versions.map((version) => (
                <option key={version.version} value={version.version}>
                  {copy.release.version} {version.version} · {formatShortGameDate(version.savedOn, state.settings.locale)}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="market-release-name">{copy.release.name}</label>
            <input
              id="market-release-name"
              maxLength={MARKET_LIMITS.maxProductNameLength}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dynasty Core 100"
              value={name}
            />
            <p className="field-hint">{copy.release.nameHint}</p>
          </div>
          <div className="field-group">
            <label htmlFor="market-release-segment">{copy.release.segment}</label>
            <select
              id="market-release-segment"
              onChange={(event) => setSegmentId(event.target.value as MarketSegmentId)}
              value={segmentId}
            >
              {MARKET_SEGMENTS.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{copy.segmentNames[candidate.id]}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="market-release-price">{copy.release.price}</label>
            <input
              id="market-release-price"
              inputMode="decimal"
              min={MARKET_LIMITS.minPriceUsd}
              onChange={(event) => setPrice(event.target.value)}
              step="1"
              type="number"
              value={price}
            />
            <p className="field-hint">{copy.release.priceHint}</p>
          </div>
          <div className="field-group market-suggested-price">
            <span>{copy.release.suggested}</span>
            <strong>{suggestedPrice === null ? "—" : formatCurrency(suggestedPrice, state.settings.locale)}</strong>
            <button
              className="button button--secondary"
              disabled={suggestedPrice === null || isSaving}
              onClick={() => suggestedPrice !== null && setPrice(String(suggestedPrice))}
              type="button"
            >
              {copy.release.useSuggested}
            </button>
          </div>
        </div>

        <div className="market-release-summary">
          <SummaryStat label={copy.release.unitCost} value={estimate ? formatCurrency(estimate.unitCostUsd, state.settings.locale) : "—"} />
          <SummaryStat label={copy.release.performance} value={performance === null ? "—" : formatDecimal(performance, state.settings.locale, 2)} />
          <SummaryStat label={copy.release.margin} value={formatShare(margin, state.settings.locale)} />
          <SummaryStat label={copy.release.launchFee} value={formatCurrency(MARKET_RULES.launchFeeUsd, state.settings.locale)} />
          <SummaryStat label={copy.release.leadTime} value={`${MARKET_RULES.productionLeadTimeDays} ${copy.release.days}`} />
        </div>

        {error && <p className="inline-feedback inline-feedback--error" role="alert">{error}</p>}

        <div className="market-form-footer">
          <p className="field-hint">
            {copy.release.launchFee}: {formatCurrency(MARKET_RULES.launchFeeUsd, state.settings.locale)}
          </p>
          <button className="button button--primary" disabled={isSaving} type="submit">
            {isSaving ? copy.release.submitting : copy.release.submit}
          </button>
        </div>
      </form>
    </section>
  );
}

function ProductCard({
  product,
  state,
  copy,
  isSaving,
  onUpdatePrice,
  onOrderProduction,
  onDiscontinue,
}: {
  product: MarketProduct;
  state: GameState;
  copy: MarketCopy;
  isSaving: boolean;
  onUpdatePrice: (productId: string, priceUsd: number) => Promise<boolean>;
  onOrderProduction: (productId: string, quantity: number) => Promise<boolean>;
  onDiscontinue: (productId: string) => Promise<boolean>;
}) {
  const locale = state.settings.locale;
  const [price, setPrice] = useState(String(product.priceUsd));
  const [quantity, setQuantity] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const pendingOrders = state.market.productionOrders.some(
    (order) => order.productId === product.id && order.status === "in-production",
  );
  const estimate = product.status === "active"
    ? estimateProductDailyDemand(state, product.id, state.gameDate)
    : null;
  const priceNumber = Number(price);
  const quantityNumber = Number(quantity);
  const batchCost = product.manufacturingCostUsd * quantityNumber;
  const invalidQuantity = !Number.isInteger(quantityNumber)
    || quantityNumber < 1
    || quantityNumber > MARKET_LIMITS.maxProductionOrderUnits;
  const invalidPrice = !Number.isFinite(priceNumber)
    || priceNumber < MARKET_LIMITS.minPriceUsd
    || priceNumber > MARKET_LIMITS.maxPriceUsd;
  const insufficientFunds = !invalidQuantity && batchCost > state.company.balance;

  async function updatePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidPrice) {
      setError(copy.release.errors.price);
      return;
    }
    setError(null);
    await onUpdatePrice(product.id, priceNumber);
  }

  async function order(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidQuantity) {
      setError(copy.invalidQuantity);
      return;
    }
    if (insufficientFunds) {
      setError(copy.insufficientFunds);
      return;
    }
    setError(null);
    await onOrderProduction(product.id, quantityNumber);
  }

  return (
    <article className={`market-product-card${product.status === "discontinued" ? " is-discontinued" : ""}`}>
      <div className="market-product-card__header">
        <div>
          <div className="market-product-card__titleline">
            <h3>{product.name}</h3>
            <span className={`market-status market-status--${product.status}`}>
              {product.status === "active" ? copy.products.active : copy.products.discontinued}
            </span>
          </div>
          <p>{copy.segmentNames[product.segmentId]} · v{product.projectVersion} · {formatShortGameDate(product.releaseDate, locale)}</p>
        </div>
        <strong>{formatCurrency(product.priceUsd, locale)}</strong>
      </div>

      <div className="market-product-stats">
        <SummaryStat label={copy.products.unitCost} value={formatCurrency(product.manufacturingCostUsd, locale)} />
        <SummaryStat label={copy.products.margin} value={formatShare(calculateGrossMargin(product.priceUsd, product.manufacturingCostUsd), locale)} />
        <SummaryStat label={copy.products.inventory} value={formatNumber(product.inventoryUnits, locale)} />
        <SummaryStat label={copy.products.sold} value={formatNumber(product.unitsSold, locale)} />
        <SummaryStat label={copy.products.revenue} value={formatCurrency(product.revenueUsd, locale)} />
        <SummaryStat label={copy.products.estimate} value={estimate ? copy.products.estUnits.replace("{units}", formatNumber(estimate.unitsPerDay, locale)) : copy.products.estimateUnavailable} />
      </div>

      {estimate && (
        <p className="market-product-card__estimate">
          {copy.products.estShare.replace("{share}", formatShare(estimate.share, locale))}
        </p>
      )}

      {product.status === "active" && (
        <>
          <div className="market-product-actions">
            <form className="market-inline-form" onSubmit={(event) => void updatePrice(event)}>
              <div className="field-group">
                <label htmlFor={`product-price-${product.id}`}>{copy.products.price}</label>
                <input
                  id={`product-price-${product.id}`}
                  inputMode="decimal"
                  min={MARKET_LIMITS.minPriceUsd}
                  onChange={(event) => setPrice(event.target.value)}
                  step="1"
                  type="number"
                  value={price}
                />
              </div>
              <button className="button button--secondary" disabled={isSaving || invalidPrice} type="submit">
                {copy.products.applyPrice}
              </button>
            </form>
            <form className="market-inline-form" onSubmit={(event) => void order(event)}>
              <div className="field-group">
                <label htmlFor={`product-quantity-${product.id}`}>{copy.products.orderQuantity}</label>
                <input
                  id={`product-quantity-${product.id}`}
                  inputMode="numeric"
                  max={MARKET_LIMITS.maxProductionOrderUnits}
                  min={1}
                  onChange={(event) => setQuantity(event.target.value)}
                  step="1"
                  type="number"
                  value={quantity}
                />
              </div>
              <button className="button button--secondary" disabled={isSaving || invalidQuantity || insufficientFunds} type="submit">
                {isSaving ? copy.products.ordering : copy.products.orderProduction}
              </button>
            </form>
          </div>
          <div className="market-product-actions__meta">
            <span>{copy.products.orderCost}: {formatCurrency(Number.isFinite(batchCost) ? batchCost : 0, locale)}</span>
            <span>{copy.products.productionLeadTime.replace("{days}", String(MARKET_RULES.productionLeadTimeDays))}</span>
          </div>
          {insufficientFunds && <p className="field-error">{copy.insufficientFunds}</p>}
          {pendingOrders && <p className="field-hint">{copy.products.pendingOrders}</p>}
          <button
            className="button button--danger market-discontinue-button"
            disabled={isSaving || pendingOrders}
            onClick={() => void onDiscontinue(product.id)}
            type="button"
          >
            {isSaving ? copy.products.discontinuing : copy.products.discontinue}
          </button>
        </>
      )}

      {error && <p className="inline-feedback inline-feedback--error" role="alert">{error}</p>}
    </article>
  );
}

function ProductionOrders({
  orders,
  products,
  copy,
  locale,
}: {
  orders: ProductionOrder[];
  products: MarketProduct[];
  copy: MarketCopy;
  locale: GameState["settings"]["locale"];
}) {
  if (orders.length === 0) {
    return <EmptyState body={copy.orders.hint} title={copy.orders.empty} />;
  }

  return (
    <div className="market-history-list">
      {[...orders].reverse().slice(0, 10).map((order) => {
        const product = products.find((candidate) => candidate.id === order.productId);
        return (
          <article className="market-history-row" key={order.id}>
            <strong>{product?.name ?? order.productId}</strong>
            <span>{copy.orders.quantity}: {formatNumber(order.quantity, locale)}</span>
            <span>{copy.orders.unitCost}: {formatCurrency(order.unitCostUsd, locale)}</span>
            <span>{copy.orders.readyOn}: {formatShortGameDate(order.readyOn, locale)}</span>
            <span className="market-status">{order.status === "in-production" ? copy.orders.statusInProduction : copy.orders.statusCompleted}</span>
          </article>
        );
      })}
    </div>
  );
}

function FinanceOverview({
  state,
  copy,
  marketCopy,
  isSaving,
  onUpdateMarketingBudget,
  onTakeLoan,
  onRepayLoan,
}: {
  state: GameState;
  copy: FinanceCopy;
  marketCopy: MarketCopy;
  isSaving: boolean;
  onUpdateMarketingBudget: (amountUsd: number) => Promise<boolean>;
  onTakeLoan: (amountUsd: number) => Promise<boolean>;
  onRepayLoan: (amountUsd: number) => Promise<boolean>;
}) {
  const locale = state.settings.locale;
  const latest = state.finance.dailyRecords.at(-1);
  const loan = state.finance.loan;
  const dailyInterest = getLoanDailyInterest(state);
  const capacity = getRemainingLoanCapacity(state);

  return (
    <div className="page-stack">
      <section className="metrics-grid" aria-label={copy.overview}>
        <MetricCard
          accent="blue"
          detail={copy.balanceHint}
          icon={Wallet}
          label={copy.balance}
          value={formatCurrency(state.company.balance, locale)}
        />
        <MetricCard
          accent="green"
          detail={copy.revenueHint}
          icon={Banknote}
          label={copy.revenue}
          value={formatCurrency(state.finance.lifetimeRevenueUsd, locale)}
        />
        <MetricCard
          accent="amber"
          detail={copy.expensesHint}
          icon={Receipt}
          label={copy.expenses}
          value={formatCurrency(state.finance.lifetimeExpensesUsd, locale)}
        />
        <MetricCard
          accent="violet"
          detail={copy.profitHint}
          icon={TrendingUp}
          label={copy.profit}
          value={formatCurrency(latest?.netProfitUsd ?? 0, locale)}
        />
        <MetricCard
          accent="blue"
          detail={copy.debtHint}
          icon={Landmark}
          label={copy.debt}
          value={formatCurrency(loan?.principalUsd ?? 0, locale)}
        />
      </section>

      <div className="market-finance-grid">
        <section className="market-card" aria-labelledby="finance-chart-title">
          <SectionHeading
            copy={copy.chartDescription}
            icon={TrendingUp}
            id="finance-chart-title"
            title={copy.chartTitle}
          />
          <FinanceChart copy={copy} locale={locale} records={state.finance.dailyRecords} />
        </section>

        <section className="market-card" aria-labelledby="finance-latest-title">
          <SectionHeading
            copy={copy.latestHint}
            icon={Receipt}
            id="finance-latest-title"
            title={copy.latestTitle}
          />
          {latest ? (
            <FinanceBreakdown copy={copy} locale={locale} record={latest} />
          ) : (
            <p className="market-empty-text">{copy.noRecord}</p>
          )}
        </section>

        <section className="market-card" aria-labelledby="finance-loan-title">
          <SectionHeading
            copy={copy.loanHint}
            icon={HandCoins}
            id="finance-loan-title"
            title={copy.loanTitle}
          />
          <LoanPanel
            capacity={capacity}
            copy={copy}
            dailyInterest={dailyInterest}
            isSaving={isSaving}
            locale={locale}
            onRepayLoan={onRepayLoan}
            onTakeLoan={onTakeLoan}
            state={state}
          />
        </section>

        <section className="market-card" aria-labelledby="finance-marketing-title">
          <SectionHeading
            copy={marketCopy.marketingHint}
            icon={Megaphone}
            id="finance-marketing-title"
            title={marketCopy.marketingTitle}
          />
          <MarketingBudget
            copy={marketCopy}
            isSaving={isSaving}
            locale={locale}
            onUpdateMarketingBudget={onUpdateMarketingBudget}
            state={state}
          />
        </section>
      </div>

      <section className="market-section" aria-labelledby="finance-transactions-title">
        <SectionHeading
          copy={marketCopy.transactionsHint}
          icon={Receipt}
          id="finance-transactions-title"
          title={marketCopy.transactionsTitle}
        />
        {state.finance.transactions.length === 0 ? (
          <EmptyState body={marketCopy.transactionsEmpty} title={marketCopy.transactionsTitle} />
        ) : (
          <div className="market-transaction-list">
            {state.finance.transactions.slice(0, 20).map((transaction) => (
              <article className="market-transaction-row" key={transaction.id}>
                <div>
                  <strong>{marketCopy.transactionCategories[transaction.category]}</strong>
                  <span>{formatShortGameDate(transaction.date, locale)}{transaction.note ? ` · ${transaction.note}` : ""}</span>
                </div>
                <div>
                  <strong className={transaction.amountUsd >= 0 ? "market-amount--income" : "market-amount--expense"}>
                    {transaction.amountUsd >= 0 ? "+" : ""}{formatCurrency(transaction.amountUsd, locale)}
                  </strong>
                  <span>{transaction.amountUsd >= 0 ? marketCopy.transactionIncome : marketCopy.transactionExpense}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LoanPanel({
  state,
  copy,
  locale,
  isSaving,
  capacity,
  dailyInterest,
  onTakeLoan,
  onRepayLoan,
}: {
  state: GameState;
  copy: FinanceCopy;
  locale: GameState["settings"]["locale"];
  isSaving: boolean;
  capacity: number;
  dailyInterest: number;
  onTakeLoan: (amountUsd: number) => Promise<boolean>;
  onRepayLoan: (amountUsd: number) => Promise<boolean>;
}) {
  const loan = state.finance.loan;
  const [takeAmount, setTakeAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const takeNumber = Number(takeAmount);
  const repayNumber = Number(repayAmount);
  const invalidTake = !Number.isFinite(takeNumber) || takeNumber <= 0 || takeNumber > capacity;
  const invalidRepay = !loan
    || !Number.isFinite(repayNumber)
    || repayNumber <= 0
    || repayNumber > loan.principalUsd
    || repayNumber > state.company.balance;

  async function take(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidTake) {
      return;
    }
    if (await onTakeLoan(takeNumber)) {
      setTakeAmount("");
    }
  }

  async function repay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidRepay) {
      return;
    }
    if (await onRepayLoan(repayNumber)) {
      setRepayAmount("");
    }
  }

  return (
    <div className="market-loan">
      {loan ? (
        <dl className="market-data-list">
          <div><dt>{copy.principal}</dt><dd>{formatCurrency(loan.principalUsd, locale)}</dd></div>
          <div><dt>{copy.rate}</dt><dd>{formatDecimal(loan.annualInterestRate * 100, locale, 1)}%</dd></div>
          <div><dt>{copy.dailyInterest}</dt><dd>{formatCurrency(dailyInterest, locale)}</dd></div>
          <div><dt>{copy.capacity}</dt><dd>{formatCurrency(capacity, locale)}</dd></div>
        </dl>
      ) : (
        <p className="market-empty-text">{copy.noLoan}</p>
      )}

      <form className="market-inline-form" onSubmit={(event) => void take(event)}>
        <div className="field-group">
          <label htmlFor="finance-take-amount">{copy.amount}</label>
          <input
            disabled={capacity <= 0 || isSaving}
            id="finance-take-amount"
            inputMode="decimal"
            max={capacity}
            min={1}
            onChange={(event) => setTakeAmount(event.target.value)}
            step="1"
            type="number"
            value={takeAmount}
          />
          <p className="field-hint">{copy.maxAmount.replace("{amount}", formatCurrency(capacity, locale))}</p>
        </div>
        <button className="button button--secondary" disabled={isSaving || invalidTake} type="submit">
          {isSaving ? copy.working : copy.take}
        </button>
      </form>

      {loan && (
        <form className="market-inline-form" onSubmit={(event) => void repay(event)}>
          <div className="field-group">
            <label htmlFor="finance-repay-amount">{copy.amount}</label>
            <input
              id="finance-repay-amount"
              inputMode="decimal"
              max={Math.min(loan.principalUsd, state.company.balance)}
              min={1}
              onChange={(event) => setRepayAmount(event.target.value)}
              step="1"
              type="number"
              value={repayAmount}
            />
          </div>
          <button className="button button--secondary" disabled={isSaving || invalidRepay} type="submit">
            {isSaving ? copy.working : copy.repay}
          </button>
        </form>
      )}
    </div>
  );
}

function MarketingBudget({
  state,
  copy,
  locale,
  isSaving,
  onUpdateMarketingBudget,
}: {
  state: GameState;
  copy: MarketCopy;
  locale: GameState["settings"]["locale"];
  isSaving: boolean;
  onUpdateMarketingBudget: (amountUsd: number) => Promise<boolean>;
}) {
  const [budget, setBudget] = useState(String(state.market.marketingBudgetUsdPerDay));
  const budgetNumber = Number(budget);
  const invalidBudget = !Number.isFinite(budgetNumber)
    || budgetNumber < 0
    || budgetNumber > MARKET_LIMITS.maxMarketingBudgetUsdPerDay;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidBudget) {
      return;
    }
    await onUpdateMarketingBudget(budgetNumber);
  }

  return (
    <form className="market-budget-form" onSubmit={(event) => void save(event)}>
      <div className="market-budget-form__current">
        <span>{copy.marketingBudget}</span>
        <strong>{formatCurrency(state.market.marketingBudgetUsdPerDay, locale)}</strong>
      </div>
      <div className="field-group">
        <label htmlFor="finance-marketing-budget">{copy.marketingBudget}</label>
        <input
          id="finance-marketing-budget"
          inputMode="decimal"
          max={MARKET_LIMITS.maxMarketingBudgetUsdPerDay}
          min={0}
          onChange={(event) => setBudget(event.target.value)}
          step="1"
          type="number"
          value={budget}
        />
        <p className="field-hint">
          {copy.marketingLimit.replace(
            "{amount}",
            formatCurrency(MARKET_LIMITS.maxMarketingBudgetUsdPerDay, locale),
          )}
        </p>
      </div>
      <button className="button button--primary" disabled={isSaving || invalidBudget} type="submit">
        {isSaving ? copy.marketingSaving : copy.marketingSave}
      </button>
    </form>
  );
}

function FinanceChart({
  records,
  copy,
  locale,
}: {
  records: FinanceDailyRecord[];
  copy: FinanceCopy;
  locale: GameState["settings"]["locale"];
}) {
  const chartRecords = records.slice(-14);
  if (chartRecords.length === 0) {
    return <p className="market-empty-text">{copy.chartEmpty}</p>;
  }

  const width = 680;
  const height = 244;
  const left = 62;
  const right = 12;
  const top = 18;
  const bottom = 38;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = niceChartMax(Math.max(
    1,
    ...chartRecords.flatMap((record) => [record.revenueUsd, getDailyExpenses(record)]),
  ));
  const groupWidth = plotWidth / chartRecords.length;
  const barWidth = Math.min(13, groupWidth * 0.3);

  return (
    <figure className="finance-chart">
      <div className="finance-chart__legend">
        <span><i className="finance-chart__swatch finance-chart__swatch--revenue" />{copy.chartRevenue}</span>
        <span><i className="finance-chart__swatch finance-chart__swatch--expenses" />{copy.chartExpenses}</span>
      </div>
      <svg
        aria-label={`${copy.chartTitle}. ${copy.chartDescription}`}
        className="finance-chart__svg"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>{copy.chartTitle}</title>
        <desc>{copy.chartDescription}</desc>
        {[0, 0.5, 1].map((ratio) => {
          const y = top + plotHeight - plotHeight * ratio;
          return (
            <g key={ratio}>
              <line
                className="finance-chart__grid"
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
              />
              <text className="finance-chart__axis-label" x={left - 8} y={y + 3} textAnchor="end">
                ${formatNumber(Math.round(maxValue * ratio), locale)}
              </text>
            </g>
          );
        })}
        {chartRecords.map((record, index) => {
          const groupX = left + index * groupWidth;
          const centerX = groupX + groupWidth / 2;
          const revenueHeight = (record.revenueUsd / maxValue) * plotHeight;
          const expensesHeight = (getDailyExpenses(record) / maxValue) * plotHeight;
          const labelEvery = chartRecords.length > 7 ? 2 : 1;
          return (
            <g key={record.date}>
              <rect
                className="finance-chart__bar finance-chart__bar--revenue"
                height={Math.max(0, revenueHeight)}
                width={barWidth}
                x={centerX - barWidth - 2}
                y={top + plotHeight - revenueHeight}
              />
              <rect
                className="finance-chart__bar finance-chart__bar--expenses"
                height={Math.max(0, expensesHeight)}
                width={barWidth}
                x={centerX + 2}
                y={top + plotHeight - expensesHeight}
              />
              {index % labelEvery === 0 && (
                <text
                  className="finance-chart__axis-label"
                  textAnchor="middle"
                  x={centerX}
                  y={height - 14}
                >
                  {record.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function FinanceBreakdown({
  record,
  copy,
  locale,
}: {
  record: FinanceDailyRecord;
  copy: FinanceCopy;
  locale: GameState["settings"]["locale"];
}) {
  const expenses = getDailyExpenses(record);
  return (
    <dl className="finance-breakdown">
      <div><dt>{copy.breakdown.revenue}</dt><dd>{formatCurrency(record.revenueUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.manufacturing}</dt><dd>{formatCurrency(-record.manufacturingUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.payroll}</dt><dd>{formatCurrency(-record.payrollUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.overhead}</dt><dd>{formatCurrency(-record.overheadUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.marketing}</dt><dd>{formatCurrency(-record.marketingUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.research}</dt><dd>{formatCurrency(-record.researchUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.release}</dt><dd>{formatCurrency(-record.releaseUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.interest}</dt><dd>{formatCurrency(-record.interestUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.tax}</dt><dd>{formatCurrency(-record.taxUsd, locale)}</dd></div>
      <div className="finance-breakdown__total"><dt>{copy.breakdown.netProfit}</dt><dd>{formatCurrency(record.netProfitUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.cashFlow}</dt><dd>{formatCurrency(record.netCashFlowUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.closingBalance}</dt><dd>{formatCurrency(record.closingBalanceUsd, locale)}</dd></div>
      <div><dt>{copy.breakdown.unitsSold}</dt><dd>{formatNumber(record.unitsSold, locale)}</dd></div>
      <div><dt>{copy.breakdown.unitsProduced}</dt><dd>{formatNumber(record.unitsProduced, locale)}</dd></div>
      <div className="finance-breakdown__expenses"><dt>{copy.chartExpenses}</dt><dd>{formatCurrency(-expenses, locale)}</dd></div>
    </dl>
  );
}

function SectionHeading({
  title,
  copy,
  icon: Icon,
  id,
}: {
  title: string;
  copy: string;
  icon: LucideIcon;
  id: string;
}) {
  return (
    <div className="market-section__heading">
      <span className="market-section__icon" aria-hidden="true"><Icon size={18} /></span>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="market-summary-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="market-empty">
      <span className="market-empty__icon" aria-hidden="true"><Boxes size={20} /></span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function getDailyExpenses(record: FinanceDailyRecord): number {
  return record.manufacturingUsd
    + record.payrollUsd
    + record.overheadUsd
    + record.marketingUsd
    + record.researchUsd
    + record.releaseUsd
    + record.interestUsd
    + record.taxUsd;
}

function formatShare(value: number, locale: GameState["settings"]["locale"]): string {
  return `${formatDecimal(value * 100, locale, 2)}%`;
}

function niceChartMax(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, value)));
  return Math.ceil(value / magnitude) * magnitude;
}
