import Link from "next/link";
import { Icon, Logo, GlassCard } from "@/components/ui";

export default function ForgotPasswordPage() {
  return (
    <main className="safe-screen grid place-items-center bg-industrial-radial px-5 text-white">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="grid h-12 w-12 place-items-center rounded-xl border border-white/10">
            <Icon name="ChevronLeft" />
          </Link>
          <Logo compact />
        </div>
        <GlassCard className="p-6">
          <h1 className="text-3xl font-semibold">Forgot Password</h1>
          <p className="mt-2 text-slate-300">Enter your work email or phone number to receive an OTP.</p>
          <form className="mt-6 space-y-4">
            <input className="min-h-14 w-full rounded-xl border border-white/14 bg-ink-950/50 px-4 outline-none focus:border-telgo-cyan" placeholder="Email or phone number" />
            <Link href="/otp" className="flex min-h-14 items-center justify-center rounded-xl bg-telgo-blue font-semibold">
              Send OTP
            </Link>
          </form>
        </GlassCard>
      </div>
    </main>
  );
}
