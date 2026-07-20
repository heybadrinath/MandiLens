import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
export const metadata: Metadata = {
  title: "Sources",
  description:
    "Official AGMARKNET source, retrieval, licence, attribution, transformations, and non-endorsement.",
};
export default function Page() {
  return <InfoPage locale="en" kind="sources" />;
}
