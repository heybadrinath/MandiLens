import type { Metadata } from "next";

import { DataPage } from "@/components/data-page";

export const metadata: Metadata = {
  title: "Data",
  description:
    "Inspect MandiLens source, validation, coverage, processing stages, data dictionary, previews, downloads, file sizes, and checksums.",
};
export default function Page() {
  return <DataPage locale="en" />;
}
