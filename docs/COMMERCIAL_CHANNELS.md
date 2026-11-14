# Commercial Channels

Stage 1 “Everything sells”: released products and infrastructure can earn recurring
revenue through simulated commercial partners. All values are game balance numbers,
not financial projections.

## Channels

| Channel | Base daily revenue | Eligible asset |
| --- | ---: | --- |
| OS licensing | $60 | Every saved OS release |
| AI API | $85 | Every AI deployment |
| Device supply | $120 | Every valid device project |
| Cloud capacity | $100 | Every valid cloud project |
| App store | $40 | Latest OS release with a non-`none` app store |

Partners are fictional companies with a channel and minimum reputation. Offers only
appear when the company reputation meets the partner threshold; the player still
chooses whether to accept.

- OS: Orbit Devices (0), Northstar Computing (5)
- AI: Cloudline AI (0), Atlas Inference (10)
- Devices: Lumina Retail (0), Titan Gaming (20)
- Cloud: SkyGrid (0), DataHarbor (15)
- App store: AppWave (0), Nexus Store (10)

## Offer generation

The daily tick expires old offers and contracts, then may create one offer when
`lastOfferOn` is empty or at least 7 days old. At most 6 open offers and 10 active
contracts are kept. An asset cannot be offered or contracted twice at the same time.

The offer is deterministic for the same game date, state and eligible assets:

- duration: 180, 270 or 360 days;
- daily revenue: `max(25, base × (0.35 + quality / 100) × (0.5 + appeal / 100))`,
  rounded to cents;
- signing bonus: `daily revenue × (10 + seed % 6)`, rounded to cents;
- offer expiry: creation date + 21 days.

Asset quality and appeal come from existing models: OS release metrics, AI deployment
metrics, device metrics and cloud metrics. No separate commercial statistics are
stored.

## Contracts and finance

Accepting an offer immediately records the signing bonus as finance category `sales`
and adds 0.5 reputation. The contract then pays its daily revenue through the same
`sales` category on every simulated day until `expiresOn`. `totalRevenueUsd` accumulates
signing bonus plus all payments. Cloud-capacity contracts also charge their modeled
daily operating cost, and device-supply contracts charge the referenced device unit
cost, as `overhead`; other channels currently have no modeled daily cost. All money
flows through `postFinanceTransaction`, so the balance, finance ledger and analytics
remain the single source of truth.

Declining an offer removes it without a penalty.

## Daily pipeline

`research → production delivery → OEM contracts → commercial contracts → competitor
actions → CPU market → component market → AI training → finance settlement →
reputation → date advance`

Commercial revenue is posted before finance settlement, so payroll, overhead, interest,
tax and the daily finance record include it.

## Persistence

Save schema 13 adds `commercialContracts`:

```ts
{
  offers: CommercialOffer[];
  active: CommercialContract[];
  lastOfferOn: string | null;
}
```

Schema 12 and older migrate with an empty commercial state. Strict parsing rejects
unknown partners, channel mismatches, duplicate IDs, expired-before-signed contracts,
invalid dates, negative money and out-of-range quality scores.

## UI

Market → “Commercial contracts” shows open offers and active contracts. Offers display
the partner, channel, asset, signing bonus, daily revenue, term, quality and minimum
reputation. Active contracts show remaining days and accumulated revenue. The dashboard
shows a commercial revenue mix for the current date plus a signal when offers are
waiting.

## Tests

- deterministic offer generation and occupied-asset exclusion;
- revenue aggregation and expiry;
- commercial state parsing and tampering rejection;
- OS/app-store asset building, daily payments, expiry, acceptance and decline;
- market offer rendering and accept callback;
- schema 12 → 13 migration and current save round-trip.

## Limitations

- Offers are generated only from assets that already exist; there is no negotiation or
  counter-offer flow.
- Contracts have no renewal, cancellation or penalty mechanics.
- Revenue is an abstract licensing/supply model, not a full contract P&L.
- Partners are fictional and do not own persistent market share.
