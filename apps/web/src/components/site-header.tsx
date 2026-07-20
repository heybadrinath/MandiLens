import Link from "next/link";

const navigation = [
  { href: "/", label: "Market lens" },
  { href: "/data-quality", label: "Data quality" },
  { href: "/model-performance", label: "Model" },
  { href: "/methodology", label: "Method" },
  { href: "/sources", label: "Sources" },
];

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="MandiLens home">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>MandiLens</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-scope" aria-label="Application scope">
          Maharashtra · 3 crops
        </div>
        <details className="mobile-nav">
          <summary aria-label="Open navigation">Menu</summary>
          <nav aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
