"use client";

import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Database,
  GitCompareArrows,
  Home,
  Languages,
  Menu,
  Network,
  Search,
  ShieldCheck,
  Store,
  TriangleAlert,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  LOCALES,
  localeDirection,
  localeFromPath,
  localizePath,
  pathWithoutLocale,
} from "@/i18n/config";
import { SHELL_COPY } from "@/i18n/shell-copy";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/lib/types";

interface SiteHeaderProps {
  stateCount: number;
  marketCount: number;
  latestDate: string;
}

export function SiteHeader({ stateCount, marketCount, latestDate }: SiteHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = localeFromPath(pathname);
  const copy = SHELL_COPY[locale];
  const basePath = pathWithoutLocale(pathname);
  const query = searchParams.toString();
  const [suggestedLocale, setSuggestedLocale] = useState<Locale | null>(null);
  const suggestedLanguage = LOCALES.find((item) => item.code === suggestedLocale);
  const nav = useMemo(
    () => [
      { href: "/", label: copy.home, icon: Home },
      { href: "/markets", label: copy.markets, icon: Store },
      { href: "/compare", label: copy.compare, icon: GitCompareArrows },
      { href: "/data", label: copy.data, icon: Database },
      { href: "/how-it-works", label: copy.how, icon: BookOpen },
    ],
    [copy],
  );
  const technicalNav = useMemo(
    () => [
      { href: "/data-quality", label: copy.quality, icon: ShieldCheck },
      { href: "/forecast-reliability", label: copy.reliability, icon: BarChart3 },
      { href: "/methodology", label: copy.methodology, icon: BookOpen },
      { href: "/sources", label: copy.sources, icon: FileText },
      { href: "/limitations", label: copy.limitations, icon: TriangleAlert },
      { href: "/architecture", label: copy.architecture, icon: Network },
    ],
    [copy],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
  }, [locale]);

  useEffect(() => {
    let nextSuggestion: Locale | null = null;
    if (locale === "en" && pathname !== "/en" && !pathname.startsWith("/en/")) {
      const storedLocale = window.localStorage.getItem("mandilens-locale");
      const remembered = LOCALES.find((item) => item.code === storedLocale);
      if (remembered) {
        if (remembered.code !== locale) nextSuggestion = remembered.code;
      } else if (!window.sessionStorage.getItem("mandilens-language-suggestion-shown")) {
        window.sessionStorage.setItem("mandilens-language-suggestion-shown", "true");
        const browserLocale = navigator.languages
          .map((value) => value.toLowerCase().split("-")[0])
          .find(
            (value) =>
              value !== "en" && LOCALES.some((supportedLocale) => supportedLocale.code === value),
          );
        if (browserLocale) nextSuggestion = browserLocale as Locale;
      }
    }

    const frame = window.requestAnimationFrame(() => setSuggestedLocale(nextSuggestion));
    return () => window.cancelAnimationFrame(frame);
  }, [locale, pathname]);

  function changeLanguage(nextLocale: Locale) {
    setSuggestedLocale(null);
    window.localStorage.setItem("mandilens-locale", nextLocale);
    const nextPath = localizePath(pathname, nextLocale);
    router.push(`${nextPath}${query ? `?${query}` : ""}${window.location.hash}`);
  }

  function isActive(href: string) {
    if (href === "/") return basePath === "/";
    return basePath === href || basePath.startsWith(`${href}/`);
  }

  const navigation = (
    <>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={localizePath(href, locale)}
          className={isActive(href) ? "is-active" : undefined}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </>
  );

  const technicalNavigation = (
    <>
      {technicalNav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={localizePath(href, locale)}
          className={isActive(href) ? "is-active" : undefined}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Icon size={16} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </>
  );

  return (
    <>
      <a className="skip-link" href="#main-content">
        {copy.skip}
      </a>
      <aside className="app-sidebar" aria-label="Primary">
        <Brand locale={locale} tagline={copy.tagline} />
        <nav className="sidebar-nav">{navigation}</nav>
        <div className="sidebar-support">
          <p>{copy.technical}</p>
          <nav aria-label={copy.technical}>{technicalNavigation}</nav>
        </div>
        <div className="sidebar-snapshot">
          <span>{copy.prepared}</span>
          <strong>
            {stateCount} {copy.states} · {marketCount} {copy.marketsCount}
          </strong>
          <small>{formatDate(latestDate, locale)}</small>
        </div>
      </aside>

      <header className="app-topbar">
        <div className="mobile-brand">
          <Brand locale={locale} tagline={copy.tagline} compact />
        </div>
        <Link
          className="topbar-search"
          href={`${localizePath("/markets", locale)}?focus=search`}
          aria-label={copy.search}
        >
          <Search size={17} aria-hidden="true" />
          <span>{copy.search}</span>
          <kbd>/</kbd>
        </Link>
        <div className="topbar-actions">
          {suggestedLanguage ? (
            <button
              className="language-suggestion"
              type="button"
              onClick={() => changeLanguage(suggestedLanguage.code)}
              aria-label={`${copy.language}: ${suggestedLanguage.nativeName}`}
            >
              <Languages size={14} aria-hidden="true" />
              {suggestedLanguage.nativeName}
            </button>
          ) : null}
          <label className="language-select">
            <Languages size={17} aria-hidden="true" />
            <span className="sr-only">{copy.language}</span>
            <select
              id="site-language"
              name="site-language"
              value={locale}
              onChange={(event) => changeLanguage(event.target.value as Locale)}
            >
              {LOCALES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.nativeName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
          <details className="mobile-menu">
            <summary aria-label={copy.menu}>
              <Menu size={20} aria-hidden="true" />
            </summary>
            <nav>
              {navigation}
              <span className="mobile-menu__label">{copy.technical}</span>
              {technicalNavigation}
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}

function Brand({
  locale,
  tagline,
  compact = false,
}: {
  locale: Locale;
  tagline: string;
  compact?: boolean;
}) {
  return (
    <Link className="brand" href={localizePath("/", locale)}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="brand-copy">
        <strong>MandiLens</strong>
        {compact ? null : <small>{tagline}</small>}
      </span>
    </Link>
  );
}
