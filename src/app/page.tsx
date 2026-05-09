import Image from "next/image";
import Link from "next/link";
import { ActiveProjectsGrid } from "@/components/dashboard-blocks";
import { LoginPanel } from "@/components/interactive";
import { Icon, Logo } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="safe-screen overflow-hidden bg-industrial-radial text-white">
      <section className="relative min-h-screen px-5 pb-10 pt-8 sm:px-8 lg:px-12">
        <Image
          src="/assets/background-hero-image.webp"
          alt="Telgo field operations"
          fill
          className="object-cover object-center opacity-55"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/60 to-ink-950" />
        <div className="relative z-10 mx-auto max-w-[1180px]">
          <header className="mb-10 flex items-center justify-between">
            <Logo />
            <Link
              href="/request-access"
              className="flex min-h-12 items-center gap-2 rounded-full border border-telgo-cyan/60 px-5 text-sm font-semibold text-telgo-cyan"
            >
              <Icon name="ShieldCheck" />
              Request Access
            </Link>
          </header>
          <div className="grid gap-8 lg:grid-cols-[1fr_520px] lg:items-end">
            <div className="max-w-[620px] pt-10">
              <h1 className="text-5xl font-semibold leading-tight tracking-normal sm:text-6xl">
                Powering <span className="text-telgo-cyan">Kerala.</span>
                <br />
                Building Tomorrow.
                <br />
                <span className="text-transparent bg-gradient-to-r from-telgo-violet to-telgo-cyan bg-clip-text">
                  Together.
                </span>
              </h1>
              <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-slate-300">
                Telgo Power Projects manages live sites, engineers, finance workflows, approvals,
                safety alerts, and client transparency from one mobile-first command center.
              </p>
              <div className="mt-8 grid max-w-[560px] grid-cols-3 gap-3">
                {[
                  ["Safety First", "ShieldCheck"],
                  ["Live Tracking", "MapPin"],
                  ["Real Progress", "Gauge"]
                ].map(([label, icon]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <Icon name={icon} className="mx-auto mb-3 h-7 w-7 text-telgo-cyan" />
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-telgo-cyan">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <LoginPanel />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1180px] px-5 pb-14 sm:px-8 lg:px-12">
        <ActiveProjectsGrid />
        <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:grid-cols-2">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-telgo-cyan/30 text-telgo-cyan">
              <Icon name="Phone" />
            </span>
            <div>
              <p className="text-slate-300">Emergency / 24x7 Support</p>
              <p className="text-xl text-telgo-cyan">+91 95443 65758</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-telgo-cyan/30 text-telgo-cyan">
              <Icon name="MessageCircle" />
            </span>
            <div>
              <p className="text-slate-300">Write to us</p>
              <p className="text-xl text-telgo-cyan">info@telgopower.com</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
