import { describe, expect, it } from "vitest";

import { LOCALES, localeDirection, localizePath, pathWithoutLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { SUPPORTED_LOCALES } from "@/lib/types";

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]));
  }
  return typeof value;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("translation dictionaries", () => {
  it("publishes all requested locales with the exact English dictionary shape", async () => {
    expect(SUPPORTED_LOCALES).toHaveLength(10);
    expect(LOCALES.map((item) => item.code)).toEqual([...SUPPORTED_LOCALES]);
    const english = await getDictionary("en");
    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = await getDictionary(locale);
      expect(shape(dictionary)).toEqual(shape(english));
      expect(strings(dictionary).every((value) => value.trim().length > 0)).toBe(true);
    }
  });

  it("uses left-to-right direction for every supported locale", () => {
    expect(localeDirection("en")).toBe("ltr");
    expect(localeDirection("kn")).toBe("ltr");
  });

  it("builds shareable locale paths without losing nested market routes", () => {
    expect(localizePath("/markets/karnataka/tomato/16-707", "kn")).toBe(
      "/kn/markets/karnataka/tomato/16-707",
    );
    expect(localizePath("/kn/markets?ignored=true", "en")).toBe("/markets?ignored=true");
    expect(pathWithoutLocale("/mr/compare")).toBe("/compare");
  });
});
