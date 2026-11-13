# OEM design-win contracts

OEM contracts are a simulated business layer that connects released CPU products to device makers. They are inspired by the Silicon Empire loop in which laptop and device manufacturers can adopt a player's chip.

This is a game simulation. Customer names, contract terms and demand effects are fictional and do not describe real companies or markets.

## What a contract does

- A device maker sends a time-limited offer for an active CPU product and its market segment.
- Accepting pays an upfront design-win fee immediately and creates an active contract.
- While the contract is active, that product receives a demand bonus in its segment.
- The contract expires after its term. There is no cancellation or early termination.
- Offers expire if ignored.

Contract income is recorded in the existing finance ledger as `sales` revenue with a note identifying the customer and product. It therefore appears in daily revenue, lifetime revenue and analytics without a second revenue path.

## Customers and eligibility

The deterministic customer catalog is defined in `src/game/models/oem-contracts.ts`:

| Customer | Minimum reputation | Preferred segments |
| --- | ---: | --- |
| Orbit Devices | 0 | budget, mainstream, performance |
| Northstar Computing | 5 | mainstream, performance |
| Lumina Mobile | 10 | budget, mainstream |
| Titan Gaming | 20 | enthusiast, performance |
| Vertex Workstations | 25 | workstation, enterprise |
| Meridian Cloud | 35 | workstation, enterprise |

Only active CPU products can receive offers. A product already covered by an active contract or a pending offer is skipped. A customer is eligible when the company reputation meets its minimum and the product segment is one of its preferred segments.

## Offer generation

- Offers are checked on every simulated day.
- A new offer is created only if there are fewer than 5 pending offers and fewer than 8 active contracts.
- The first eligible product can generate an offer immediately; later offers are spaced by at least 14 days from the last generated offer.
- Product and customer selection use a date-based deterministic seed, so the same save and date produce the same offer.
- Offers stay valid for 21 days.

Offer terms:

- **Term:** 120, 180, 240 or 300 days, selected deterministically.
- **Upfront payment:** at least $5,000, derived from product price, performance and a design-win multiplier.
- **Demand bonus:** 5-35%, derived from product performance and company reputation.
- **Minimum reputation:** copied from the customer for display and validation context.

## Daily pipeline

`runOemContractDay` runs after production and before competitor actions and market sales:

1. Expire active contracts whose end date has been reached.
2. Expire offers whose validity date has passed.
3. Generate a new offer when the interval and limits allow it.

Market simulation then multiplies a product's appeal by `1 + active demand bonus / 100`. The bonus applies only to the matching product and segment. Existing behaviour is unchanged when no contract is active.

## Persistence

Schema v12 adds `oemContracts` to `GameState`:

```ts
interface OemContractState {
  offers: OemContractOffer[];
  active: OemContract[];
  lastOfferOn: string | null;
}
```

Offers store customer, product, segment, dates, term, upfront payment, demand bonus and minimum reputation. Active contracts additionally store the signing date, expiry date and source offer ID. Version 1-11 saves receive empty lists and `lastOfferOn: null`. Parsing rejects invalid dates, unknown customers, invalid segments, duplicate IDs, exceeded caps and invalid terms.

## UI

The Market overview contains an **OEM contracts** section:

- pending offer cards with customer, product, segment, upfront payment, demand bonus, term, expiry and accept/decline actions;
- active-contract cards with remaining days, bonus, payment and expiry;
- empty state explaining that a competitive processor is required.

The section uses real state only and does not create a second source of truth for market demand.

## Tests

- `src/game/models/oem-contracts.test.ts`: deterministic generation, demand-bonus expiry, parser round-trip, duplicate IDs.
- `src/game/engine/oem-contracts.test.ts`: daily offer, accept payment, decline, unknown/expired offers, expiry, demand-estimate increase.
- `src/game/application/game-application.test.ts`: accepted contract survives reload.
- `src/features/market/MarketPage.test.tsx`: offer rendering and accept callback.
- `src/game/models/game-state.test.ts` and save migration fixtures: v11 to v12 initialization.

## Known limitations

- Contracts target CPU products only.
- There is no negotiation, exclusivity, penalty, cancellation or customer relationship history.
- The demand bonus is an appeal multiplier, not a separate guaranteed order book.
- Contract income is classified as sales revenue rather than a separate licensing category.
- Customer names and terms are fictional balance values and require later balancing.
