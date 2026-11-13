import type { Locale } from "../game/models/game-state";

const LOCALE_TAGS: Record<Locale, string> = {
  ru: "ru-RU",
  en: "en-US",
};

export function formatCurrency(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatYear(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    useGrouping: false,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDecimal(value: number, locale: Locale, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    maximumFractionDigits,
  }).format(value);
}

export function formatGameDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function formatShortGameDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
