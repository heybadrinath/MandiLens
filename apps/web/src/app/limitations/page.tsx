import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
export const metadata: Metadata = {
  title: "Limitations",
  description:
    "Coverage, freshness, aggregation, forecasting, and real-market limitations for MandiLens.",
};
export default function Page() {
  return <InfoPage locale="en" kind="limitations" />;
}
