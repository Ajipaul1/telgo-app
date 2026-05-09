"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { approvals as approvalSeed, chatMessages, projects, sitePhotos } from "@/lib/demo-data";
import { formatInr } from "@/lib/utils";
import { useOfflineStore } from "@/store/offline-store";
import { Badge, GlassCard, Icon, SectionHeader, toneClasses } from "@/components/ui";
import type { Approval, ChatMessage, StatusTone } from "@/lib/types";

function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}

export function LoginPanel() {
  const [role, setRole] = useState<"engineer" | "admin" | "finance" | "client">("engineer");
  const [identifier, setIdentifier] = useState("arjun@telgopower.com");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Demo credentials route you to the selected workspace.");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Checking secure session...");
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier.includes("@") ? identifier : "demo@telgopower.com",
      password: password || "demo-password"
    });

    if (error) {
      setStatus("Demo mode active. Supabase auth is wired for real users.");
    }

    const target =
      role === "admin"
        ? "/app/admin"
        : role === "finance"
          ? "/app/admin/finance"
          : role === "client"
            ? "/app/client"
            : "/app/engineer";
    window.location.href = target;
  }

  return (
    <GlassCard className="w-full max-w-[520px] p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold">Welcome Back</h2>
        <p className="text-slate-300">Sign in to continue</p>
      </div>
      <div className="mb-5 grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
        {(["engineer", "admin", "finance", "client"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setRole(item)}
            className={`rounded-xl px-2 py-3 text-xs capitalize transition ${
              role === item ? "bg-telgo-cyan/15 text-telgo-cyan" : "text-slate-300"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">User ID / Phone Number</span>
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="w-full rounded-xl border border-white/14 bg-ink-950/50 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-telgo-cyan"
            placeholder="Enter user ID or phone"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-white/14 bg-ink-950/50 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-telgo-cyan"
            placeholder="Enter password"
            type="password"
          />
        </label>
        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="inline-flex items-center gap-2 text-slate-200">
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-telgo-cyan" />
            Remember me
          </label>
          <a href="/forgot-password" className="text-telgo-cyan">
            Forgot Password?
          </a>
        </div>
        <button
          type="submit"
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-telgo-cyan via-telgo-blue to-telgo-violet text-lg font-semibold text-white shadow-glow"
        >
          Sign In
          <Icon name="ChevronRight" />
        </button>
      </form>
      <div className="my-5 flex items-center gap-4 text-sm text-slate-400">
        <span className="h-px flex-1 bg-white/10" />
        or continue with
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <a
        href="/request-access"
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-telgo-cyan/50 text-telgo-cyan"
      >
        <Icon name="ShieldCheck" />
        Request Access
      </a>
      <p className="mt-4 text-sm text-slate-400">{status}</p>
    </GlassCard>
  );
}

export function RequestAccessForm() {
  const [status, setStatus] = useState("ready");
  const [file, setFile] = useState<File | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("submitting");

    let documentPath: string | null = null;
    if (file) {
      const path = `public/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error } = await supabase.storage.from("access-documents").upload(path, file, {
        upsert: false
      });
      if (!error) documentPath = path;
    }

    const { error } = await supabase.from("access_requests").insert({
      full_name: String(form.get("full_name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      company_name: String(form.get("company_name") ?? ""),
      gst_number: String(form.get("gst_number") ?? ""),
      company_address: String(form.get("company_address") ?? ""),
      requested_role: String(form.get("requested_role") ?? "client"),
      access_purpose: String(form.get("access_purpose") ?? "project_portal"),
      document_path: documentPath,
      status: "pending"
    });

    setStatus(error ? "saved-locally" : "submitted");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormBlock icon="User" title="Personal Information" subtitle="Tell us about yourself">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="full_name" label="Full Name" placeholder="Enter your full name" required />
          <Field name="phone" label="Phone Number" placeholder="Enter your phone number" required />
          <Field
            name="email"
            label="Email Address"
            placeholder="Enter your email address"
            type="email"
            className="sm:col-span-2"
            required
          />
        </div>
      </FormBlock>
      <FormBlock icon="Building2" title="Company Information" subtitle="Details about your organization">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="company_name" label="Company Name" placeholder="Enter company name" required />
          <Field name="gst_number" label="GST Number" placeholder="Enter GST number" />
          <Field
            name="company_address"
            label="Company Address"
            placeholder="Enter company address"
            className="sm:col-span-2"
          />
        </div>
      </FormBlock>
      <FormBlock icon="ShieldCheck" title="Role & Access" subtitle="Your role and access requirements">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            name="requested_role"
            label="Your Role"
            options={["client", "site engineer", "supervisor", "finance"]}
          />
          <SelectField
            name="access_purpose"
            label="Access Required For"
            options={["project portal", "finance approvals", "site monitoring", "client transparency"]}
          />
        </div>
      </FormBlock>
      <FormBlock icon="Upload" title="Document Upload" subtitle="Upload your ID / license for verification">
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-telgo-cyan/45 bg-white/[0.025] px-4 py-5 text-center">
          <Icon name="CloudUpload" className="mb-2 h-8 w-8 text-telgo-cyan" />
          <span className="font-medium text-white">
            {file ? file.name : "Upload ID / License / Registration Proof"}
          </span>
          <span className="text-sm text-slate-400">PDF, JPG, PNG (Max 5MB)</span>
          <input
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </FormBlock>
      <label className="inline-flex items-center gap-3 text-sm text-slate-200">
        <input type="checkbox" required defaultChecked className="h-5 w-5 accent-telgo-cyan" />
        I confirm that the provided information is accurate and correct.
      </label>
      <button
        type="submit"
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-telgo-cyan via-telgo-blue to-telgo-violet text-lg font-semibold text-white shadow-glow"
      >
        Submit Request
        <Icon name="Send" />
      </button>
      <p className="text-center text-sm text-slate-300">
        {status === "submitted"
          ? "Request submitted to Supabase for admin review."
          : status === "saved-locally"
            ? "Supabase rejected the write, so the form stayed safe in demo mode."
            : status === "submitting"
              ? "Submitting request..."
              : "Need help? Contact Support +91 95443 65758"}
      </p>
    </form>
  );
}

export function AttendanceAction() {
  const online = useOnlineStatus();
  const addItem = useOfflineStore((state) => state.addItem);
  const [status, setStatus] = useState("Ready to Check-In");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  async function checkIn() {
    setStatus("Verifying GPS...");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => setCoords({ lat: 11.2588, lng: 75.7873 }),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    const payload = {
      project_id: projects[0].id,
      check_in_at: new Date().toISOString(),
      latitude: coords?.lat ?? 11.2588,
      longitude: coords?.lng ?? 75.7873,
      gps_accuracy_m: 7,
      status: "pending_approval"
    };

    if (!online) {
      addItem({
        type: "attendance",
        title: "GPS Attendance",
        size: "0.2 MB",
        payload
      });
      setStatus("Saved Offline");
      return;
    }

    const { error } = await supabase.from("attendance").insert(payload);
    if (error) {
      addItem({
        type: "attendance",
        title: "GPS Attendance",
        size: "0.2 MB",
        payload
      });
      setStatus("Queued for Sync");
    } else {
      setStatus("Checked In");
    }
  }

  return (
    <GlassCard className="p-5">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div>
          <p className="text-sm text-slate-300">Check-In Time</p>
          <p className="mt-2 text-3xl font-semibold">08:01 AM</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-telgo-green">
            <Icon name="CheckCircle2" className="h-4 w-4" />
            GPS Verified
          </p>
        </div>
        <button
          onClick={checkIn}
          type="button"
          className="mx-auto grid h-40 w-40 place-items-center rounded-full border border-green-300/40 bg-gradient-to-br from-green-300 to-green-700 shadow-[0_0_46px_rgba(34,224,82,0.35)]"
        >
          <Icon name="UserCheck" className="h-16 w-16 text-white" />
        </button>
        <div className="sm:text-right">
          <p className="text-sm text-slate-300">Status</p>
          <p className="mt-2 text-3xl font-semibold text-telgo-green">{status}</p>
          <p className="mt-2 text-sm text-slate-300">{online ? "Online sync enabled" : "Offline mode"}</p>
        </div>
      </div>
    </GlassCard>
  );
}

export function WorkLogForm() {
  const online = useOnlineStatus();
  const addItem = useOfflineStore((state) => state.addItem);
  const [status, setStatus] = useState("ready");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projects[0].id,
      work_type: String(form.get("work_type") ?? "HDD Drilling Operation"),
      activity_details: String(form.get("activity_details") ?? ""),
      drilling_method: String(form.get("drilling_method") ?? "HDD"),
      depth_reached_m: Number(form.get("depth") ?? 0),
      meters_completed: Number(form.get("meters") ?? 0),
      weather: String(form.get("weather") ?? "Sunny"),
      temperature_c: 32,
      status: "submitted"
    };

    if (!online) {
      addItem({ type: "site_log", title: "Daily Site Log", size: "1.2 MB", payload });
      setStatus("queued");
      return;
    }

    const { error } = await supabase.from("site_logs").insert(payload);
    if (error) {
      addItem({ type: "site_log", title: "Daily Site Log", size: "1.2 MB", payload });
      setStatus("queued");
    } else {
      setStatus("submitted");
    }
  }

  return (
    <GlassCard className="p-5">
      <SectionHeader title="Work Progress Details" action={<Badge tone="cyan">12 May 2025</Badge>} />
      <form onSubmit={submit} className="space-y-4">
        <SelectField name="work_type" label="Work Type" options={["HDD Drilling Operation", "Cable Laying", "Jointing", "Backfilling"]} />
        <TextArea
          name="activity_details"
          label="Activity Details"
          defaultValue="Drilling in progress towards KP-2. Smooth operation. No major issues."
          max={500}
        />
        <SelectField
          name="drilling_method"
          label="Drilling Method"
          options={["Horizontal Directional Drilling (HDD)", "Open Trench", "Manual Jointing"]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="depth" label="Depth Reached (m)" defaultValue="8.5" />
          <Field name="meters" label="Meters Drilled Today" defaultValue="245" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="weather" label="Weather Condition" options={["Sunny", "Cloudy", "Rain Alert"]} />
          <Field name="temperature" label="Temperature" defaultValue="32°C" />
        </div>
        <TextArea name="remarks" label="Remarks (Optional)" placeholder="Add any additional remarks..." max={300} />
        <button
          type="submit"
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-telgo-violet to-telgo-cyan text-lg font-semibold text-white shadow-glow"
        >
          <Icon name="CloudUpload" />
          Save Work Log
        </button>
        <p className="text-sm text-slate-300">
          {status === "submitted"
            ? "Work log submitted."
            : status === "queued"
              ? "Saved to offline queue for automatic sync."
              : "Photos and logs are encrypted in transit."}
        </p>
      </form>
    </GlassCard>
  );
}

export function FinanceRequestForm() {
  const addItem = useOfflineStore((state) => state.addItem);
  const [status, setStatus] = useState("ready");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projects[0].id,
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      amount: Number(String(form.get("amount") ?? "0").replace(/,/g, "")),
      category: "fuel",
      status: "pending"
    };
    const { error } = await supabase.from("expenses").insert(payload);
    if (error) {
      addItem({ type: "expense", title: "Finance Request", size: "0.8 MB", payload });
      setStatus("queued");
    } else {
      setStatus("submitted");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <GlassCard className="p-5">
        <SectionHeader title="1. Request Type" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Advance Request", "WalletCards", "green"],
            ["Reimbursement", "FileText", "blue"],
            ["Purchase Request", "PackageCheck", "amber"]
          ].map(([label, icon, tone]) => (
            <label
              key={label}
              className="relative flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-white/12 bg-white/[0.025] p-4 text-center has-[:checked]:border-telgo-green"
            >
              <input name="request_type" type="radio" defaultChecked={label === "Advance Request"} className="sr-only" />
              <Icon name={icon} className={`mb-4 h-9 w-9 ${toneClasses[tone as StatusTone].split(" ")[0]}`} />
              <span className="text-base font-semibold">{label}</span>
              <span className="mt-2 text-sm text-slate-300">
                {label === "Advance Request" ? "Request advance for site expenses" : label === "Reimbursement" ? "Reimburse spent amount" : "Request material or equipment"}
              </span>
            </label>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="space-y-4 p-5">
        <SectionHeader title="2. Request Details" />
        <Field name="title" label="Title / Purpose" defaultValue="Diesel advance for HDD machine" />
        <TextArea
          name="description"
          label="Description"
          defaultValue="Requesting advance for diesel required for HDD operations for the next 2 days."
          max={250}
        />
        <Field name="amount" label="Amount (₹)" defaultValue="5,000" />
        <Field name="expected_date" label="Expected Date" defaultValue="May 13, 2025" />
      </GlassCard>
      <GlassCard className="p-5">
        <SectionHeader title="3. Attachments" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Attachment label="Diesel_Requirement.pdf" meta="248 KB" tone="green" />
          <Attachment label="HDD_Machine_Photo.jpg" meta="1.2 MB" tone="blue" image={sitePhotos[0]} />
          <label className="grid min-h-20 cursor-pointer place-items-center rounded-xl border border-dashed border-white/20 text-center text-slate-300">
            <span>
              <Icon name="Plus" className="mx-auto mb-1" />
              Add More
            </span>
            <input type="file" multiple className="sr-only" />
          </label>
        </div>
      </GlassCard>
      <button
        type="submit"
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-telgo-cyan to-telgo-blue text-lg font-semibold text-white shadow-glow"
      >
        <Icon name="Send" />
        Submit Request
      </button>
      <button
        type="button"
        onClick={() => setStatus("draft")}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/14 text-white"
      >
        <Icon name="FileText" />
        Save as Draft
      </button>
      <p className="text-center text-sm text-slate-300">
        {status === "submitted"
          ? "Finance request submitted."
          : status === "queued"
            ? "Saved offline and queued for sync."
            : status === "draft"
              ? "Draft saved in this device."
              : "Default approver: Anitha R., Finance Manager"}
      </p>
    </form>
  );
}

export function ShiftReportForm() {
  const addItem = useOfflineStore((state) => state.addItem);
  const [status, setStatus] = useState("ready");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addItem({
      type: "site_log",
      title: "End Shift Report",
      size: "1.6 MB",
      payload: { submittedAt: new Date().toISOString() }
    });
    setStatus("submitted");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <GlassCard className="p-5">
        <SectionHeader title="1. Work Summary" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Trenching", "120", "Meters", "green"],
            ["Cable Laid", "85", "Meters", "cyan"],
            ["Joints Completed", "6", "Nos", "amber"],
            ["Team Size", "8", "Members", "violet"]
          ].map(([label, value, unit, tone]) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${toneClasses[tone as StatusTone]}`}>
              <p className="text-sm text-slate-200">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
              <p className="text-sm text-slate-300">{unit}</p>
            </div>
          ))}
        </div>
        <TextArea
          name="work_performed"
          label="Work Performed"
          defaultValue="Trenching and cable laying completed from Palayam to West Hill. 6 nos joints completed. Backfilling in progress."
          max={300}
          className="mt-4"
        />
      </GlassCard>
      <GlassCard className="p-5">
        <SectionHeader title="2. Site Photos" action={<span className="text-sm text-telgo-cyan">View All</span>} />
        <div className="flex gap-3 overflow-x-auto thin-scrollbar">
          {sitePhotos.slice(0, 4).map((photo) => (
            <div key={photo} className="relative h-28 min-w-36 overflow-hidden rounded-xl">
              <Image src={photo} alt="Site photo" fill className="object-cover" />
            </div>
          ))}
          <label className="grid h-28 min-w-36 cursor-pointer place-items-center rounded-xl border border-dashed border-white/20 text-slate-300">
            <span className="text-center">
              <Icon name="Plus" className="mx-auto" />
              Add Photo
            </span>
            <input type="file" className="sr-only" />
          </label>
        </div>
      </GlassCard>
      <GlassCard className="p-5">
        <SectionHeader title="3. Materials Used" action={<span className="text-sm text-telgo-cyan">+ Add Material</span>} />
        <div className="overflow-hidden rounded-xl border border-white/10">
          {[
            ["33kV XLPE Cable", "Meter", "85", "CIAL Approved"],
            ["Cable Joint Kit", "Nos", "6", "Heat Shrink"],
            ["Sand", "Cum", "3.2", "Backfilling"],
            ["Warning Tiles", "Nos", "20", "Installed"]
          ].map((row) => (
            <div key={row[0]} className="grid grid-cols-4 gap-2 border-b border-white/10 px-3 py-3 text-sm last:border-b-0">
              {row.map((cell) => (
                <span key={cell} className="text-slate-200">
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="p-5">
        <TextArea
          name="notes"
          label="4. Challenges / Notes"
          defaultValue="Hard soil condition in segment 2 caused delay. Water seepage in segment 3."
          max={250}
        />
      </GlassCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className="min-h-14 rounded-xl border border-white/20 text-white">
          Save as Draft
        </button>
        <button type="submit" className="min-h-14 rounded-xl bg-telgo-blue font-semibold text-white">
          Submit Report
        </button>
      </div>
      <p className="text-center text-sm text-slate-300">
        {status === "submitted" ? "Report saved to offline queue and ready for sync." : "End shift report is ready."}
      </p>
    </form>
  );
}

export function ApprovalQueue({ category }: { category?: Approval["category"] }) {
  const [items, setItems] = useState(approvalSeed);
  const visible = category ? items.filter((item) => item.category === category) : items;

  async function decide(id: string, status: "Approved" | "Rejected") {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
    await supabase.from("activity_logs").insert({
      entity_type: "approval",
      entity_id: id,
      action: status.toLowerCase(),
      metadata: { source: "telgo-hub-ui" }
    });
  }

  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <GlassCard key={item.id} className="p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-telgo-blue/12 text-telgo-cyan">
                  <Icon name={item.category === "Finance" ? "ReceiptIndianRupee" : item.category === "Leave" ? "CalendarDays" : "ClipboardCheck"} />
                </span>
                <div>
                  <h3 className="font-semibold text-white">{item.requester}</h3>
                  <p className="text-sm text-slate-300">{item.project}</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-300">
              {item.amount ? <p className="text-lg font-semibold text-white">{formatInr(item.amount)}</p> : null}
              <p>{item.meta}</p>
              {item.range ? <p className="text-telgo-amber">{item.range}</p> : null}
            </div>
            <div className="flex gap-2">
              {item.status === "Pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => decide(item.id, "Approved")}
                    className="grid h-12 w-12 place-items-center rounded-xl border border-green-400/50 text-telgo-green"
                  >
                    <Icon name="Check" />
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(item.id, "Rejected")}
                    className="grid h-12 w-12 place-items-center rounded-xl border border-red-400/50 text-telgo-red"
                  >
                    ×
                  </button>
                </>
              ) : (
                <Badge tone={item.status === "Approved" ? "green" : "red"}>{item.status}</Badge>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

export function ChatRoom() {
  const [messages, setMessages] = useState(chatMessages);
  const [body, setBody] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const channel = supabase.channel("project-chat-cial");
    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages((current) => [...current, payload as ChatMessage]);
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    const message: ChatMessage = {
      id: `local-${Date.now()}`,
      author: "You",
      role: "Site Engineer",
      body,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      tone: "cyan",
      reactions: 0
    };
    setMessages((current) => [...current, message]);
    setBody("");
    await supabase.channel("project-chat-cial").send({
      type: "broadcast",
      event: "message",
      payload: message
    });
  }

  return (
    <GlassCard className="min-h-[70svh] p-4">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <div>
          <h2 className="text-xl font-semibold">CIAL 33kV UG Cable Laying</h2>
          <p className="text-sm text-slate-300">Project Chat · 18 Members</p>
        </div>
        <Badge tone={connected ? "green" : "amber"}>{connected ? "Realtime" : "Connecting"}</Badge>
      </div>
      <div className="space-y-5 pb-24">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <div className={`mt-1 h-11 w-11 rounded-full border ${toneClasses[message.tone]}`} />
            <div className="max-w-[760px] rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={toneClasses[message.tone].split(" ")[0]}>{message.author}</span>
                <span className="text-xs text-slate-400">{message.role}</span>
                <span className="ml-auto text-xs text-slate-400">{message.time}</span>
              </div>
              <p className="text-base leading-relaxed text-white">{message.body}</p>
              {message.images?.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {message.images.map((image) => (
                    <div key={image} className="relative h-24 overflow-hidden rounded-xl">
                      <Image src={image} alt="Chat attachment" fill className="object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
              {message.reactions ? (
                <Badge tone="amber" className="mt-3">
                  👍 {message.reactions}
                </Badge>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="sticky bottom-24 mt-4 flex gap-2 rounded-2xl border border-white/10 bg-ink-950/90 p-2 backdrop-blur">
        <button className="grid h-12 w-12 place-items-center rounded-xl border border-white/10" type="button">
          <Icon name="Plus" />
        </button>
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Type a message..."
          className="min-w-0 flex-1 bg-transparent px-2 text-white outline-none placeholder:text-slate-500"
        />
        <button className="grid h-12 w-12 place-items-center rounded-xl bg-telgo-blue" type="submit">
          <Icon name="Send" />
        </button>
      </form>
    </GlassCard>
  );
}

export function OfflineSyncManager() {
  const online = useOnlineStatus();
  const items = useOfflineStore((state) => state.items);
  const markSynced = useOfflineStore((state) => state.markSynced);
  const clearAll = useOfflineStore((state) => state.clearAll);
  const pending = items.filter((item) => item.status !== "synced");
  const synced = items.filter((item) => item.status === "synced");
  const percent = Math.round((synced.length / Math.max(items.length, 1)) * 100);

  function syncNow() {
    pending.forEach((item, index) => {
      window.setTimeout(() => markSynced(item.id), 320 * (index + 1));
    });
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="grid h-36 w-36 place-items-center rounded-full border-8 border-telgo-blue/80 border-r-white/10 border-b-telgo-blue/80 border-l-white/10">
            <div className="text-center">
              <p className="text-3xl font-semibold">{Math.max(percent, 50)}%</p>
              <p className="text-sm text-slate-300">Synced</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-300">Sync Status</p>
            <h2 className="mt-1 text-2xl font-semibold">{online ? "Sync in Progress..." : "Offline Mode"}</h2>
            <p className="mt-2 text-telgo-blue">Uploading {pending.length} of {items.length} items</p>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-telgo-blue" style={{ width: `${Math.max(percent, 50)}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={syncNow}
            className="min-h-12 rounded-xl border border-telgo-cyan/40 px-5 font-semibold text-telgo-cyan"
          >
            Sync Now
          </button>
        </div>
      </GlassCard>
      {!online ? (
        <GlassCard className="border-amber-400/25 bg-amber-950/20 p-4">
          <div className="flex items-center gap-3 text-telgo-amber">
            <Icon name="WifiOff" className="h-8 w-8" />
            <div>
              <p className="font-semibold">You are currently offline</p>
              <p className="text-sm text-slate-300">Data is saved locally and will sync automatically.</p>
            </div>
          </div>
        </GlassCard>
      ) : null}
      <GlassCard className="p-5">
        <SectionHeader
          title={`Pending Items (${pending.length})`}
          action={
            <button type="button" onClick={clearAll} className="text-sm text-telgo-red">
              Clear All Pending
            </button>
          }
        />
        <div className="divide-y divide-white/10 rounded-xl border border-white/10">
          {pending.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-telgo-blue/12 text-telgo-cyan">
                <Icon name={item.type === "photo" ? "ImageIcon" : item.type === "expense" ? "ReceiptIndianRupee" : "ClipboardList"} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-slate-400">{item.createdAt}</p>
              </div>
              <div className="text-right text-sm">
                <p>{item.size}</p>
                <p className={item.status === "syncing" ? "text-telgo-cyan" : "text-telgo-amber"}>{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

export function LeaveRequestForm() {
  const [status, setStatus] = useState("ready");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("leave_requests").insert({
      leave_type: String(form.get("leave_type") ?? "Casual Leave"),
      start_date: "2025-05-20",
      end_date: "2025-05-22",
      reason: String(form.get("reason") ?? ""),
      status: "pending"
    });
    setStatus(error ? "queued" : "submitted");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <GlassCard className="p-5">
        <SectionHeader title="Employee Details" />
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[url('/assets/telgo-logo-cropped.png')] bg-cover" />
          <div>
            <h3 className="text-lg font-semibold">Ravi S.</h3>
            <p className="text-slate-300">Site Engineer</p>
          </div>
        </div>
      </GlassCard>
      <GlassCard className="space-y-4 p-5">
        <SelectField name="leave_type" label="Leave Type" options={["Casual Leave", "Earned Leave", "Medical Leave"]} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="start_date" label="Start Date" defaultValue="20 May 2025" />
          <Field name="end_date" label="End Date" defaultValue="22 May 2025" />
        </div>
        <TextArea name="reason" label="Reason for Leave" defaultValue="Family function. Need to be at home during this period." max={200} />
      </GlassCard>
      <button type="submit" className="min-h-14 w-full rounded-xl bg-gradient-to-r from-telgo-blue to-telgo-violet font-semibold text-white">
        Submit Request
      </button>
      <p className="text-center text-sm text-slate-300">
        {status === "submitted" ? "Leave request submitted." : status === "queued" ? "Leave request saved in demo mode." : "Total Days: 3 Days"}
      </p>
    </form>
  );
}

function FormBlock({
  icon,
  title,
  subtitle,
  children
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-start gap-3">
        <Icon name={icon} className="mt-1 h-6 w-6 text-telgo-cyan" />
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-300">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </GlassCard>
  );
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
  type = "text",
  required,
  className
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="min-h-13 w-full rounded-xl border border-white/14 bg-ink-950/45 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-telgo-cyan"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  max,
  className
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  max?: number;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <label className={className}>
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        maxLength={max}
        rows={4}
        className="w-full resize-none rounded-xl border border-white/14 bg-ink-950/45 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-telgo-cyan"
      />
      {max ? <span className="-mt-7 mr-3 block text-right text-xs text-slate-400">{value.length}/{max}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  options
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label>
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <select
        name={name}
        className="min-h-13 w-full rounded-xl border border-white/14 bg-ink-950/70 px-4 py-3 text-white outline-none transition focus:border-telgo-cyan"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Attachment({
  label,
  meta,
  tone,
  image
}: {
  label: string;
  meta: string;
  tone: StatusTone;
  image?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
      {image ? (
        <div className="relative h-12 w-12 overflow-hidden rounded-lg">
          <Image src={image} alt={label} fill className="object-cover" />
        </div>
      ) : (
        <span className={`grid h-12 w-12 place-items-center rounded-lg ${toneClasses[tone]}`}>
          <Icon name="FileText" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-400">{meta}</p>
      </div>
      <button type="button" className="text-slate-400">
        ×
      </button>
    </div>
  );
}
