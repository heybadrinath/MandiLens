"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { localeFromPath } from "@/i18n/config";
import { STATE_COPY } from "@/i18n/state-copy";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const copy = STATE_COPY[localeFromPath(usePathname())];
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="route-error" role="alert">
      <TriangleAlert aria-hidden="true" />
      <p className="eyebrow">{copy.errorKicker}</p>
      <h1>{copy.errorTitle}</h1>
      <p>{copy.errorBody}</p>
      <button className="button button--primary" type="button" onClick={unstable_retry}>
        <RefreshCw size={16} /> {copy.retry}
      </button>
    </div>
  );
}
