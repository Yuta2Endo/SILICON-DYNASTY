# Press reviews

## Scope

Press reviews are a derived simulation of technology journalism. They react to
released CPU products, price positioning, performance and company reputation.
Reviews are game values; they do not represent real publications or hardware.

No review history is persisted. The current review for each product is
recomputed deterministically from the saved game state, so old saves remain
compatible and there is no save-schema change.

## Review cadence

- The first review appears 30 days after a product release.
- A new review cycle starts every 90 days after that.
- Only active CPU products are reviewed.
- Each product has one current review per cycle.

`getPressReview` returns `null` before the first review. The review contains:

- product ID and name;
- outlet ID;
- publication date;
- cycle index;
- score from 5 to 98;
- sentiment: `positive` (70+), `mixed` (45-69) or `negative` (below 45);
- headline key and demand factor.

## Score

The score starts at 52 and combines:

- price positioning against the segment reference price, clamped to ±20;
- market performance against the segment reference performance, clamped to
  -15/+20;
- reputation contribution `(reputation - 50) * 0.12`;
- deterministic cycle noise in the range ±5.

Higher prices lower the score; stronger performance, lower prices and higher
reputation raise it.

## Demand effect

The score maps to a bounded demand multiplier:

`0.92 + score * 0.0016`, clamped to `0.90..1.10`.

Examples: score 50 → `1.000`, score 0 → `0.920`, score 100 → `1.080`.
The multiplier applies to both real market simulation and the daily demand
estimate. It stacks multiplicatively with OEM design-win bonuses.

## UI

The dashboard shows up to three current reviews in the «Пресса» panel:

- outlet, score out of 100 and sentiment color;
- localized headline and quote with the product name;
- product and publication date;
- shortcut to the market.

Before any product reaches 30 days on sale, the panel explains that the press
will notice it after the first month.

## Tests

- `src/game/formulas/press.test.ts` covers review timing, determinism, price
  and performance effects, review cycles and demand-factor bounds.
- `src/features/dashboard/DashboardPage.test.tsx` covers the press panel after a
  product reaches the market.

## Limitations

- Reviews are derived and not stored, so there is no press archive.
- Outlets are fictional and use a fixed catalog of four names.
- Headline and quote variation is template-based.
- Reviews affect CPU products only; component, OS, AI, device and cloud
  products keep their existing launch systems.
