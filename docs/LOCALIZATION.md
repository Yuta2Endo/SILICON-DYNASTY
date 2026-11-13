# Localization Specification

## Languages
Russian (`ru`) and English (`en`).

## Rules
Centralize all user-facing strings. Do not hardcode text in UI components. Use complete localized messages rather than concatenating fragments whose word order varies. Support pluralization and locale-aware dates, numbers and currencies. Keep domain IDs and enum values language-neutral.

## Suggested structure
```text
src/localization/
  index.ts
  ru/
    common.json
    game.json
    hardware.json
    operating-system.json
    ai.json
    economy.json
  en/
    common.json
    game.json
    hardware.json
    operating-system.json
    ai.json
    economy.json
```

Language selection is a user setting and must not reset game progress or require a new save. All screens must update on language change.

## QA
Check key parity, missing translations, pluralization, long-string layout and date/currency formatting.
