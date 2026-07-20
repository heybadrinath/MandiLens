import type { Locale } from "@/lib/types";

// Keep figures and dates in one Indian Latin convention; translated labels carry the selected language.
export const INTL_LOCALES: Record<Locale, string> = {
  en: "en-IN",
  hi: "en-IN",
  kn: "en-IN",
  te: "en-IN",
  ta: "en-IN",
  ml: "en-IN",
  mr: "en-IN",
  or: "en-IN",
  bn: "en-IN",
  gu: "en-IN",
};

const DAY_UNITS: Record<Locale, { one: string; other: string }> = {
  en: { one: "day", other: "days" },
  hi: { one: "दिन", other: "दिन" },
  kn: { one: "ದಿನ", other: "ದಿನಗಳು" },
  te: { one: "రోజు", other: "రోజులు" },
  ta: { one: "நாள்", other: "நாட்கள்" },
  ml: { one: "ദിവസം", other: "ദിവസങ്ങൾ" },
  mr: { one: "दिवस", other: "दिवस" },
  or: { one: "ଦିନ", other: "ଦିନ" },
  bn: { one: "দিন", other: "দিন" },
  gu: { one: "દિવસ", other: "દિવસ" },
};

export function formatCurrency(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, locale: Locale = "en", digits = 1): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCompact(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, locale: Locale = "en", digits = 1): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(
  value: string,
  locale: Locale = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(date);
}

export function formatDateTime(value: string, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function formatBytes(value: number, locale: Locale = "en"): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${formatNumber(size, locale, size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatRelativeDays(days: number, locale: Locale = "en"): string {
  if (days === 0) return `0 ${DAY_UNITS[locale].other}`;
  return `${formatNumber(days, locale, 0)} ${days === 1 ? DAY_UNITS[locale].one : DAY_UNITS[locale].other}`;
}

export function formatDays(days: number, locale: Locale = "en"): string {
  return `${formatNumber(days, locale, 0)} ${days === 1 ? DAY_UNITS[locale].one : DAY_UNITS[locale].other}`;
}

export function formatMonth(month: number, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
