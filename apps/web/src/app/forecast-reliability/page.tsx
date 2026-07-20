import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
export const metadata: Metadata = {
  title: "Forecast reliability",
  description:
    "Future-only method evaluation, error measures, prediction interval coverage, data sufficiency, and forecast limitations.",
};
export default function Page() {
  return <InfoPage locale="en" kind="forecastReliability" />;
}
