import Link from "next/link";
import { GlassCard, Icon, Logo } from "@/components/ui";

export default function OtpPage() {
  return (
    <main className="safe-screen grid place-items-center bg-industrial-radial px-5 text-white">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/forgot-password" className="grid h-12 w-12 place-items-center rounded-xl border border-white/10">
            <Icon name="ChevronLeft" />
          </Link>
          <Logo compact />
        </div>
        <GlassCard className="p-6">
          <h1 className="text-3xl font-semibold">Verify OTP</h1>
          <p className="mt-2 text-slate-300">Enter the secure code sent to your registered contact.</p>
          <div className="mt-6 grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                maxLength={1}
                className="aspect-square rounded-xl border border-white/14 bg-ink-950/50 text-center text-xl outline-none focus:border-telgo-cyan"
              />
            ))}
          </div>
          <Link href="/app/engineer" className="mt-6 flex min-h-14 items-center justify-center rounded-xl bg-telgo-blue font-semibold">
            Verify & Continue
          </Link>
        </GlassCard>
      </div>
    </main>
  );
}
