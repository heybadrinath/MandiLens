import type { Metadata } from "next";

import { MarketsPage } from "@/components/markets-page";

export const metadata: Metadata = {
  title: "Markets",
  description:
    "Search, filter, and inspect represented mandi market-commodity series across the prepared dataset.",
};

export default function Page() {
  return <MarketsPage locale="en" />;
}
