import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <div className="footer-wordmark">MandiLens</div>
          <p>
            Evidence-led mandi intelligence for Maharashtra. Decision support, not a guaranteed
            price or financial advice.
          </p>
        </div>
        <div className="footer-links" aria-label="Supporting information">
          <Link href="/methodology">Methodology</Link>
          <Link href="/sources">Sources &amp; licence</Link>
          <Link href="/limitations">Limitations</Link>
          <a
            href="https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi"
            target="_blank"
            rel="noreferrer"
          >
            Official dataset ↗
          </a>
        </div>
      </div>
      <div className="site-footer__base">
        <span>Built from AGMARKNET 2.0 market reports.</span>
        <span>No login · No tracking · No paid service</span>
      </div>
    </footer>
  );
}
