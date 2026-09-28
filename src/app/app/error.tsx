"use client";
import { useEffect } from "react";
import { reportProblem } from "@/lib/client/api";

// One screen breaking never takes the app down: the menu stays, this says what happened in words,
// and the Problems log gets the details.
export default function ScreenError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportProblem(`Screen crashed: ${error.message}`, typeof location !== "undefined" ? location.pathname : "screen", (error.stack ?? "") + (error.digest ? ` digest ${error.digest}` : "")); }, [error]);
  return (
    <main className="main">
      <div className="notice bad" role="alert">
        <b>This screen stopped working</b>
        <span>Nothing you had already saved is lost. The problem was sent to the admin (System → Problems).</span>
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn small" onClick={reset}>Try again</button>
          <a className="btn small ghost" href="/app">Go to Home</a>
        </div>
      </div>
    </main>
  );
}
