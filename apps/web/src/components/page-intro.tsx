import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  summary,
  aside,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  aside?: ReactNode;
}) {
  return (
    <section className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-intro__summary">{summary}</p>
      </div>
      {aside ? <div className="page-intro__aside">{aside}</div> : null}
    </section>
  );
}
