import type { Metadata } from "next";
import { HowPage } from "@/components/how-page";
export const metadata: Metadata = {
  title: "How it works",
  description:
    "A plain-language guide to how MandiLens retrieves, validates, aggregates, analyses, evaluates, and publishes mandi reports.",
};
export default function Page() {
  return <HowPage locale="en" />;
}
