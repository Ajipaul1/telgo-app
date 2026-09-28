import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sessionFromToken, SID } from "@/lib/server/session";
import { db, T } from "@/lib/server/core";
import { PERSON_COLS, personView, type PersonRow } from "@/lib/server/people";
import { Shell } from "@/components/Shell";
import type { MeView } from "@/components/AppContext";

// Every /app screen: the sign-in ticket is checked with the database before anything is drawn.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const s = await sessionFromToken(c.get(SID)?.value).catch(() => ({ me: null, state: "error" as const }));
  if (!s.me) redirect(`/login?why=${encodeURIComponent(s.state)}`);
  const me = s.me!;
  const { data } = await db(me.id).from(T.users).select(PERSON_COLS).eq("id", me.id).maybeSingle();
  if (!data) redirect("/login?why=gone");
  const view: MeView = { ...(personView(data as unknown as PersonRow) as Omit<MeView, "voiceLanguage" | "isTest" | "role">), role: me.role, voiceLanguage: me.voiceLanguage, isTest: me.isTest };
  return <Shell initialMe={view}>{children}</Shell>;
}
