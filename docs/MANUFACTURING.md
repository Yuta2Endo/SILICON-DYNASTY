# Manufacturing and Component Inventory

## Scope

Stage 2 adds a shared fabrication layer for component products:

- factory level 1–5 with capacity growth;
- paid production batches with a lead time;
- component inventory, production counters and stockouts;
- component sales limited by available inventory;
- factory upgrades and production queue UI.

CPU manufacturing keeps its existing production-order flow. Devices, cloud
capacity and AI hardware do not yet use the factory queue; those integrations are
later stages.

## Factory

| Level | Capacity per day | Upgrade cost |
| --- | ---: | ---: |
| 1 | 1,000 | $150,000 |
| 2 | 2,000 | $300,000 |
| 3 | 4,000 | $450,000 |
| 4 | 8,000 | $600,000 |
| 5 | 16,000 | — |

Capacity is used to calculate lead time, not to cap daily deliveries after a batch
is ready.

## Production orders

A component product can queue up to 20 active batches. Quantity is an integer from
1 to 100,000. The full manufacturing cost is charged when the order is placed and
uses finance category `manufacturing`.

Lead time:

```
leadDays = 4 + ceil(quantity / factoryCapacity)
readyOn  = orderedOn + leadDays
```

Examples at level 1:

| Batch | Lead time |
| ---: | ---: |
| 100 | 5 days |
| 1,000 | 5 days |
| 2,000 | 6 days |
| 10,000 | 14 days |

On the ready date the batch moves into inventory and increments `unitsProduced`.
The finance daily record also receives the produced units.

## Inventory and sales

`ComponentMarketProduct` now stores:

- `inventoryUnits` — available stock;
- `unitsProduced` — cumulative delivered units;
- `unitsSold` — cumulative sales;
- `revenueUsd` — cumulative revenue.

Invariant: `unitsProduced === unitsSold + inventoryUnits`.

Daily component demand still comes from price, performance, reputation,
marketing, release age, competitors and the economic cycle. Sales are capped by
available inventory:

```
soldUnits = min(demandedUnits, inventoryUnits)
```

Revenue is posted as finance category `sales`; manufacturing cost is not charged
again on the sale day. A product with zero inventory shows an out-of-stock state
and earns nothing until the next batch arrives.

## Daily pipeline

```
research
→ CPU production delivery
→ component production delivery
→ OEM contracts
→ commercial contracts
→ competitor actions
→ CPU market
→ component market (inventory-capped sales)
→ AI training
→ finance settlement
→ reputation
→ date advance
```

## Persistence

Save schema 14 adds:

```ts
interface ManufacturingState {
  factoryLevel: number; // 1..5
  componentOrders: ComponentProductionOrder[];
}
```

Legacy component products without inventory migrate with `inventoryUnits = 0` and
`unitsProduced = unitsSold`. Saves from schema 15 or newer are rejected.

## UI

The Market screen adds a «Производство» panel showing factory level, capacity,
queue size, next upgrade cost and active batches. Each active component product
card shows inventory, produced and sold counters, an out-of-stock message, the
order form, estimated batch cost and lead time.

The button is disabled when the quantity is invalid, funds are insufficient, the
queue is full, or the product is discontinued.

## Tests

- Model: capacity/lead-time scaling, upgrade costs, parser round-trip and tamper
  rejection.
- Engine: batch charge and queueing, delivery date, inventory/units produced,
  factory upgrade, invalid quantity/product.
- Market engine: inventory-capped sales and revenue without duplicate
  manufacturing cost.
- UI: component production order callback.
- E2E: create component → release → order a batch → queue visible.
- Schema: v13 → v14 migration and strict v14 round-trip.

## Known limitations

- Component orders have no per-day partial delivery; a batch arrives whole on its
  ready date.
- Factory maintenance and energy costs are not modeled yet.
- Factory upgrades affect lead time only; they do not increase simultaneous order
  count or product quality.
- CPU, device and cloud manufacturing still use their earlier production or
  reference models.
