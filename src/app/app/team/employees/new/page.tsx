"use client";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Button, ErrorNote, Select, TextInput } from "@/components/ui";
import { call, ApiError } from "@/lib/client/api";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/shared/roles";
import { Check, TempPasswordCard, type TempResult } from "../../_parts/parts";

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

export default function NewPerson() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [sendEmail, setSendEmail] = useState(true);
  const [err, setErr] = useState<ApiError | null>(null);
  const [done, setDone] = useState<{ result: TempResult; askedEmail: boolean } | null>(null);

  const missing = !fullName.trim() ? "Write their name." : !email.trim() ? "Write their email." : !role ? "Choose their work." : null;

  const save = async () => {
    setErr(null);
    if (missing) { setErr(new ApiError(missing, "INVALID")); return; }
    try {
      const r = await call<TempResult>("/api/team/people", { body: { fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), role, sendEmail } });
      setDone({ result: r, askedEmail: sendEmail });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErr(e instanceof ApiError ? e : new ApiError(String((e as Error)?.message ?? e), "ERROR"));
    }
  };

  const again = () => {
    setDone(null); setFullName(""); setEmail(""); setPhone(""); setRole(""); setSendEmail(true); setErr(null);
  };

  return (
    <Screen title="Add a person" roles={["admin"]} testId="employee-new">
      {done ? (
        <>
          <TempPasswordCard result={done.result} askedEmail={done.askedEmail} what="Login made" testId="new-person-done" />
          <Button kind="soft" block onClick={again} testId="new-another">Add another person</Button>
          <Button kind="soft" block href="/app/team/employees" testId="new-back-list">Back to Employees</Button>
        </>
      ) : (
        <div className="card" data-testid="new-person-form">
          <p className="small muted">They get a login ID and a temporary password, shown to you once. They must change the password the first time they sign in.</p>
          <TextInput label="Name" value={fullName} onChange={setFullName} autoComplete="off" maxLength={80} testId="new-name" />
          <TextInput label="Email" type="email" inputMode="email" value={email} onChange={setEmail} autoComplete="off" maxLength={200} testId="new-email" />
          <TextInput label="Phone" type="tel" inputMode="tel" value={phone} onChange={setPhone} autoComplete="off" maxLength={20} placeholder="+91 98470 12345" hint="Optional" testId="new-phone" />
          <Select label="Work" value={role} onChange={setRole} options={ROLE_OPTIONS} placeholder="Choose their work" testId="new-role" />
          <Check label="Also email the login details to them" checked={sendEmail} onChange={setSendEmail} testId="new-send-email" />
          {err && <ErrorNote error={err} title="Not saved" />}
          <Button big block onClick={save} busyText="Making the login…" testId="new-save">Make the login</Button>
        </div>
      )}
    </Screen>
  );
}
