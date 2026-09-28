"use client";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Empty, Loaded, Pill, TextInput } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { fmtWhen } from "@/lib/shared/format";
import { reasonWords, shortDevice, useDebounced } from "@/app/app/team/_parts/parts";

type Attempt = { id: string | number; at: string; identifier: string | null; user_id: string | null; ok: boolean; reason: string | null; ip: string | null; user_agent: string | null };

export default function SignIns() {
  const [q, setQ] = useState("");
  const search = useDebounced(q.trim(), 400);
  const load = useLoad<{ items: Attempt[] }>(`/api/system?view=sign-ins${search ? `&q=${encodeURIComponent(search)}` : ""}`, { every: 30 });
  return (
    <Screen title="Sign-ins" roles={["admin"]} testId="system-sign-ins">
      <p className="small muted">Every try to sign in, newest first (the last 300). Five wrong passwords lock a login for 15 minutes.</p>
      <TextInput label="Search" value={q} onChange={setQ} placeholder="Login ID or email typed" maxLength={80} testId="signins-search" />
      <Loaded load={load} isEmpty={(d) => !d.items.length} empty={<Empty title={search ? "No sign-ins match" : "No sign-ins recorded yet"}>{search ? `Nothing typed as “${search}”.` : null}</Empty>}>
        {(d) => (
          <>
            <div className="section-title">{d.items.length === 1 ? "1 attempt" : `${d.items.length} attempts`}</div>
            <div className="list" data-testid="signins-list">
              {d.items.map((a) => {
                const body = (
                  <>
                    <div className="grow">
                      <div className="title" style={{ overflowWrap: "anywhere" }}>{a.identifier || "nothing typed"}</div>
                      <div className="sub">{fmtWhen(a.at)} · {reasonWords(a.reason)}</div>
                      <div className="sub tiny ellipsis">{shortDevice(a.user_agent)}{a.ip ? ` · network ${a.ip}` : " · network not recorded"}</div>
                    </div>
                    <div className="end">{a.ok ? <Pill tone="ok">OK</Pill> : <Pill tone="bad">Refused</Pill>}</div>
                  </>
                );
                return a.user_id
                  ? <a key={a.id} className="item" href={`/app/team/employees/${a.user_id}`} data-testid="signin-row">{body}</a>
                  : <div key={a.id} className="item" data-testid="signin-row">{body}</div>;
              })}
            </div>
          </>
        )}
      </Loaded>
    </Screen>
  );
}
