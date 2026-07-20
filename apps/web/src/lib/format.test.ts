import { describe, expect, it } from "vitest";

import { formatCurrency, formatDate, formatDays, formatNumber } from "@/lib/format";

describe("locale formatting", () => {
  it("keeps values unchanged while localizing presentation", () => {
    expect(formatNumber(1234.5, "en")).toContain("1,234.5");
    expect(formatNumber(1234.5, "hi")).toContain("1,234.5");
    expect(formatCurrency(2500, "en")).toContain("2,500");
  });

  it("formats source dates in the requested locale and UTC", () => {
    expect(formatDate("2026-07-20", "en")).toBe("20 Jul 2026");
    expect(formatDate("2026-07-20", "ta")).toBe("20 Jul 2026");
  });

  it("localizes day units", () => {
    expect(formatDays(1, "en")).toBe("1 day");
    expect(formatDays(7, "en")).toBe("7 days");
    expect(formatDays(7, "gu")).toBe("7 દિવસ");
  });
});
