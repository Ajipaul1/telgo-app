import Image from "next/image";
import { LoginPanel } from "@/components/interactive";
import { Logo } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="safe-screen relative grid place-items-center overflow-hidden bg-industrial-radial px-5 py-8 text-white">
      <Image
        src="/assets/hero-power-grid-team.webp"
        alt="Telgo field operations"
        fill
        className="object-cover opacity-25"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-ink-950/92 to-ink-950" />
      <section className="relative z-10 w-full max-w-[520px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <LoginPanel />
      </section>
    </main>
  );
}
