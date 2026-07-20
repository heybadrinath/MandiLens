"use client";

import { usePathname } from "next/navigation";

import { localeFromPath } from "@/i18n/config";
import { STATE_COPY } from "@/i18n/state-copy";

export default function Loading() {
  const copy = STATE_COPY[localeFromPath(usePathname())];
  return (
    <div className="route-loading" aria-live="polite" aria-busy="true">
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>{copy.loading}</p>
    </div>
  );
}
