import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
export const metadata: Metadata = {
  title: "Architecture and operations",
  description:
    "Batch pipeline, static delivery, generated partitions, refresh workflow, and operational boundaries.",
};
export default function Page() {
  return <InfoPage locale="en" kind="architecture" />;
}
