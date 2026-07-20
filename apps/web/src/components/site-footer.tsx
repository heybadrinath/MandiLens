"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { localeFromPath, localizePath } from "@/i18n/config";
import { SHELL_COPY } from "@/i18n/shell-copy";

export function SiteFooter({ sourceUrl }: { sourceUrl: string }) {
  const locale = localeFromPath(usePathname());
  const copy = SHELL_COPY[locale];
  return (
    <footer className="site-footer">
      <div>
        <strong>MandiLens</strong>
        <span>{copy.footer}</span>
      </div>
      <nav aria-label={copy.technical}>
        <Link href={localizePath("/sources", locale)}>{copy.sources}</Link>
        <Link href={localizePath("/methodology", locale)}>{copy.methodology}</Link>
        <Link href={localizePath("/limitations", locale)}>{copy.limitations}</Link>
        <a href={sourceUrl} target="_blank" rel="noreferrer">
          {copy.official} ↗
        </a>
      </nav>
      <p>{copy.advice}</p>
    </footer>
  );
}
