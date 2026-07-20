"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="route-error" role="alert">
      <TriangleAlert aria-hidden="true" />
      <p className="eyebrow">Unexpected application error</p>
      <h1>The lens could not render this view.</h1>
      <p>
        No input was saved or sent. Retry the route; if it persists, use the source and methodology
        pages.
      </p>
      <button className="button button--primary" type="button" onClick={unstable_retry}>
        <RefreshCw size={16} /> Try again
      </button>
    </div>
  );
}
