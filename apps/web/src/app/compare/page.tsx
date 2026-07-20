import type { Metadata } from "next";

import { ComparePage } from "@/components/compare-page";

export const metadata: Metadata = {
  title: "Compare markets",
  description:
    "Compare two to four represented markets on one common observed or forecast date using your own quantity and cost assumptions.",
};

export default function Page() {
  return <ComparePage locale="en" />;
}
