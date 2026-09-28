"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "./AppContext";
import { Empty } from "./ui";
import type { Role } from "@/lib/shared/roles";

// Every screen: sets the top bar's title and checks the role (the server checks it again for the data).
// Its content appears only once the page can answer a tap: a form shown a moment earlier would lose
// what was typed into it (slow phones, iPhone Safari).
export function Screen({ title, roles, children, flush, testId }: { title: string; roles?: Role[]; children: ReactNode; flush?: boolean; testId?: string }) {
  const { me, setTitle } = useApp();
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => { setTitle(title); document.title = `${title} · Telgo`; return () => setTitle(null); }, [title, setTitle]);
  if (!ready) return <main className={"main" + (flush ? " flush" : "")} aria-busy="true"><div className="skeleton" /><div className="skeleton" /></main>;
  if (me && roles && !roles.includes(me.role)) {
    return <main className="main" data-testid={testId}><Empty title="Not for your login">This screen isn&apos;t part of your menu.</Empty></main>;
  }
  return <main className={"main" + (flush ? " flush" : "")} data-testid={testId}>{children}</main>;
}
