import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How MandiLens validates, aggregates, analyses, evaluates, and publishes market reports and forecasts.",
};
export default function Page() {
  return <InfoPage locale="en" kind="methodology" />;
}
