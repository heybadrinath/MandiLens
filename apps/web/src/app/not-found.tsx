import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="route-error">
      <span className="route-error__code">404</span>
      <p className="eyebrow">Market route not found</p>
      <h1>There is no report at this address.</h1>
      <p>Return to the dashboard to choose from the published Maharashtra market series.</p>
      <Link className="button button--primary" href="/">
        <ArrowLeft size={16} /> Back to MandiLens
      </Link>
    </div>
  );
}
