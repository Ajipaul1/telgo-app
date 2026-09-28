"use client";
// useLoad + Loaded for a path that changes with the filters. Each path gets its own loader (keyed), so a
// filter changed while the previous answer is still on its way is always loaded, never left spinning.
import type { ReactNode } from "react";
import { Loaded } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";

type Props<T> = { path: string; every?: number; isEmpty?: (d: T) => boolean; empty?: ReactNode; skeleton?: number; children: (d: T) => ReactNode };

export function Fetch<T>(props: Props<T>) {
  return <One<T> key={props.path} {...props} />;
}

function One<T>({ path, every, isEmpty, empty, skeleton, children }: Props<T>) {
  const load = useLoad<T>(path, { every });
  return <Loaded load={load} isEmpty={isEmpty} empty={empty} skeleton={skeleton}>{children}</Loaded>;
}
