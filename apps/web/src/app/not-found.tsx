"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { localeFromPath, localizePath } from "@/i18n/config";
import { STATE_COPY } from "@/i18n/state-copy";

export default function NotFound() {
  const locale = localeFromPath(usePathname());
  const copy = STATE_COPY[locale];
  return (
    <div className="route-error">
      <span className="route-error__code">404</span>
      <p className="eyebrow">{copy.notFoundKicker}</p>
      <h1>{copy.notFoundTitle}</h1>
      <p>{copy.notFoundBody}</p>
      <Link className="button button--primary" href={localizePath("/", locale)}>
        <ArrowLeft size={16} /> {copy.backHome}
      </Link>
    </div>
  );
}
