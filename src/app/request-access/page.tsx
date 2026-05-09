import Image from "next/image";
import Link from "next/link";
import { RequestAccessForm } from "@/components/interactive";
import { Icon, Logo } from "@/components/ui";

export default function RequestAccessPage() {
  return (
    <main className="safe-screen bg-industrial-radial px-5 pb-10 pt-5 text-white sm:px-8">
      <div className="mx-auto max-w-[980px]">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="grid h-12 w-12 place-items-center rounded-xl border border-white/10">
            <Icon name="ChevronLeft" />
          </Link>
          <Logo compact />
        </div>
        <section className="relative mb-5 overflow-hidden rounded-3xl border border-white/10 p-6">
          <Image
            src="/assets/hero-power-grid-team.webp"
            alt="Telgo access request"
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/82 to-transparent" />
          <div className="relative max-w-[620px] py-12">
            <h1 className="text-4xl font-semibold">
              Request <span className="text-telgo-cyan">Access</span>
            </h1>
            <p className="mt-3 text-lg text-slate-300">
              Fill in your details to request portal access. Our team will review and get back to
              you.
            </p>
          </div>
        </section>
        <RequestAccessForm />
      </div>
    </main>
  );
}
