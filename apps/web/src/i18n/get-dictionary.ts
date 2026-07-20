import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/lib/types";

const dictionaries: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => import("@/i18n/dictionaries/en"),
  hi: () => import("@/i18n/dictionaries/hi"),
  kn: () => import("@/i18n/dictionaries/kn"),
  te: () => import("@/i18n/dictionaries/te"),
  ta: () => import("@/i18n/dictionaries/ta"),
  ml: () => import("@/i18n/dictionaries/ml"),
  mr: () => import("@/i18n/dictionaries/mr"),
  or: () => import("@/i18n/dictionaries/or"),
  bn: () => import("@/i18n/dictionaries/bn"),
  gu: () => import("@/i18n/dictionaries/gu"),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  try {
    return (await dictionaries[locale]()).default;
  } catch {
    return (await dictionaries.en()).default;
  }
}
