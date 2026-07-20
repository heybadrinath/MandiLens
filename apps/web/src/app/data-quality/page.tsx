import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
export const metadata: Metadata = {
  title: "Data quality",
  description:
    "Accepted, rejected, corrected, stale, anomalous, and missing mandi records in the current prepared dataset.",
};
export default function Page() {
  return <InfoPage locale="en" kind="dataQuality" />;
}
