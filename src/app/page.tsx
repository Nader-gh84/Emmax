import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import Link from "next/link";

/**
 * Desktop landing — pixel replica of marketing reference page_3.png
 *
 * Hero photo (required for exact match):
 *   public/images/hero-landing-page3.jpg
 * Outdoor skyline + suspension bridge + woman with blue headset.
 * NOTE: public/images/hero-assistant-v3.png is a DIFFERENT indoor/hologram shot
 * and must NOT be used as a substitute for pixel-perfect fidelity.
 */

export const metadata: Metadata = {
  title: "EmaX — AI Assistant for Trades",
  description:
    "Work smarter, not harder. Plan, quote, manage, and get paid with EmaX.",
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const NAV_LINKS: Array<{
  label: string;
  href: string;
  active?: boolean;
}> = [
  { label: "HOME", href: "/", active: true },
  { label: "ABOUT", href: "#about" },
  { label: "FEATURES", href: "#features" },
  { label: "PRICING", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const FEATURES = [
  { num: "01", title: "Projects", desc: "All in one place" },
  { num: "02", title: "Suppliers", desc: "Best prices, faster" },
  { num: "03", title: "Customers", desc: "Happy and informed" },
] as const;

/** Accent cyan matching headset glow / X / “smarter” in reference */
const ACCENT = "#7DD3FC";

function TriangleLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="18"
      viewBox="0 0 22 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M11 1.2L20.8 18.5H1.2L11 1.2Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M11 5.8L16.4 15.4H5.6L11 5.8Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  );
}

function HeroTriangle() {
  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-[46%] -z-0 h-[620px] w-[560px] -translate-x-1/2 -translate-y-1/2"
      viewBox="0 0 560 620"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="triStroke" x1="280" y1="10" x2="280" y2="600">
          <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
          <stop offset="60%" stopColor="rgba(186,230,253,0.7)" />
          <stop offset="100%" stopColor="rgba(56,189,248,0.45)" />
        </linearGradient>
      </defs>
      <path
        d="M280 28 L538 582 L22 582 Z"
        stroke="url(#triStroke)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SmarterUnderline() {
  return (
    <svg
      className="pointer-events-none absolute -bottom-[6px] left-[-2%] h-[16px] w-[104%]"
      viewBox="0 0 240 16"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M3 11 C48 3, 95 14, 138 8 C172 3, 205 12, 236 6"
        stroke={ACCENT}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div
      className={`${spaceGrotesk.className} relative h-screen min-h-[900px] w-full min-w-[1280px] overflow-hidden bg-[#020617] text-white antialiased`}
    >
      {/* Full-bleed hero — must be the page_3 outdoor skyline photo */}
      <div
        className="absolute inset-0 bg-[#0a1628] bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/hero-landing-page3.jpg')",
          backgroundPosition: "58% center",
        }}
        role="img"
        aria-label="Ema, AI assistant for trades"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/30" />

      <div className="relative z-10 mx-auto flex h-full min-h-[900px] max-w-[1600px] flex-col px-12 pb-9 pt-9 xl:px-16">
        {/* Nav */}
        <header className="relative flex h-12 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <TriangleLogo className="text-white" />
            <span className="text-[21px] font-semibold tracking-tight">
              Ema<span style={{ color: ACCENT }}>X</span>
            </span>
          </Link>

          <nav className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="relative text-[11px] font-medium tracking-[0.32em] text-white transition hover:opacity-80"
              >
                {link.label}
                {link.active ? (
                  <span className="absolute -bottom-[7px] left-1/2 block h-px w-8 -translate-x-1/2 bg-white" />
                ) : null}
              </Link>
            ))}
          </nav>

          <Link
            href="/login"
            className="inline-flex h-[38px] items-center rounded-full border border-white/85 px-6 text-[11px] font-medium tracking-[0.22em] text-white transition hover:bg-white/10"
          >
            SIGN IN&nbsp;&nbsp;→
          </Link>
        </header>

        {/* Stage */}
        <main className="relative flex flex-1 flex-col">
          <p className="absolute left-1/2 top-[9.5%] -translate-x-1/2 text-[11px] font-medium tracking-[0.45em] text-white/92">
            AI ASSISTANT FOR TRADES
          </p>

          <HeroTriangle />

          {/* Center stack: wordmark + CTA sit on the triangle */}
          <div className="absolute left-1/2 top-[46%] flex w-full -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <h1 className="select-none text-[84px] font-medium leading-none tracking-[0.4em] text-white xl:text-[92px]">
              <span className="-mr-[0.05em]">E</span>
              <span className="mx-[0.02em]">M</span>
              <span className="mx-[0.02em] inline-block translate-y-[-0.03em]">
                Λ
              </span>
              <span className="ml-[0.02em]" style={{ color: ACCENT }}>
                X
              </span>
            </h1>

            <div className="mt-[168px] flex flex-col items-center xl:mt-[180px]">
              <Link
                href="/signup"
                className="flex h-[70px] w-[70px] items-center justify-center rounded-full transition hover:scale-[1.04]"
                style={{
                  backgroundColor: "#38BDF8",
                  boxShadow:
                    "0 0 0 9px rgba(56,189,248,0.16), 0 0 36px rgba(56,189,248,0.55)",
                }}
                aria-label="Click to enter"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6L15 12L9 18"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <p className="mt-3.5 text-[10px] font-medium tracking-[0.36em] text-white/95">
                CLICK TO ENTER
              </p>
            </div>
          </div>

          {/* Right copy */}
          <div className="absolute right-0 top-[32%] w-[360px] text-right xl:right-4">
            <h2 className="text-[44px] font-medium leading-[1.15] tracking-[-0.025em] xl:text-[48px]">
              <span className="block text-white">
                Work{" "}
                <span
                  className="relative inline-block"
                  style={{ color: ACCENT }}
                >
                  smarter,
                  <SmarterUnderline />
                </span>
              </span>
              <span className="mt-0.5 block text-white">not harder.</span>
            </h2>
            <p className="mt-8 text-[11px] font-medium tracking-[0.3em] text-white/90">
              PLAN&nbsp;&nbsp;/&nbsp;&nbsp;QUOTE&nbsp;&nbsp;/&nbsp;&nbsp;MANAGE&nbsp;&nbsp;/&nbsp;&nbsp;GET
              PAID
            </p>
          </div>
        </main>

        {/* Bottom */}
        <footer className="grid grid-cols-[160px_1fr_140px] items-end gap-6 pt-4">
          <div className="flex items-center gap-2.5 pb-2">
            <span className="h-[2px] w-7 rounded-full bg-white" />
            <span className="h-[5px] w-[5px] rounded-full bg-white/75" />
            <span className="h-[5px] w-[5px] rounded-full bg-white/75" />
            <span className="h-[5px] w-[5px] rounded-full bg-white/75" />
            <span className="h-[5px] w-[5px] rounded-full bg-white/75" />
            <span className="ml-5 h-[5px] w-[5px] rounded-full bg-white/45" />
          </div>

          <div
            id="features"
            className="flex items-start justify-center gap-16 xl:gap-24"
          >
            {FEATURES.map((item) => (
              <div key={item.num} className="min-w-[150px]">
                <p className="text-[15px] font-medium tracking-wide text-white">
                  <span className="mr-2.5 tabular-nums text-white">
                    {item.num}
                  </span>
                  {item.title}
                </p>
                <p className="mt-1 pl-[2.1rem] text-[13px] text-white/50">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end pb-3">
            <Link
              href="/signup"
              className="group flex w-[110px] items-center"
              aria-label="Continue"
            >
              <span className="h-px flex-1 bg-white/85 group-hover:bg-white" />
              <span className="pl-1 text-[18px] leading-none text-white/90 group-hover:translate-x-0.5 group-hover:text-white">
                →
              </span>
            </Link>
          </div>
        </footer>

        <div id="about" className="sr-only" />
        <div id="pricing" className="sr-only" />
        <div id="faq" className="sr-only" />
      </div>
    </div>
  );
}
