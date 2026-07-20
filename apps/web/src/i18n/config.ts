import type { Locale } from "@/lib/types";
import { isLocale, SUPPORTED_LOCALES } from "@/lib/types";

export const LOCALES: Array<{
  code: Locale;
  nativeName: string;
  englishName: string;
  direction: "ltr" | "rtl";
}> = [
  { code: "en", nativeName: "English", englishName: "English", direction: "ltr" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", direction: "ltr" },
  { code: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada", direction: "ltr" },
  { code: "te", nativeName: "తెలుగు", englishName: "Telugu", direction: "ltr" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil", direction: "ltr" },
  { code: "ml", nativeName: "മലയാളം", englishName: "Malayalam", direction: "ltr" },
  { code: "mr", nativeName: "मराठी", englishName: "Marathi", direction: "ltr" },
  { code: "or", nativeName: "ଓଡ଼ିଆ", englishName: "Odia", direction: "ltr" },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali", direction: "ltr" },
  { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati", direction: "ltr" },
];

export const localeCodes = SUPPORTED_LOCALES;

export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return LOCALES.find((item) => item.code === locale)?.direction ?? "ltr";
}

export function localeFromPath(pathname: string): Locale {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment && isLocale(segment) ? segment : "en";
}

export function pathWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && isLocale(segments[0])) segments.shift();
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

export function localizePath(pathname: string, locale: Locale): string {
  const base = pathWithoutLocale(pathname);
  if (locale === "en") return base;
  return base === "/" ? `/${locale}` : `/${locale}${base}`;
}
