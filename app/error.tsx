"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("route render failed", { digest: error.digest, message: error.message });
  }, [error]);
  return <main className="pageShell utilityPage"><div className="emptyState errorState"><strong>this view could not load</strong><span>no transaction was submitted. retry the read-only request.</span><button className="button buttonPrimary" onClick={reset} type="button">retry</button></div></main>;
}
