import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import Link from "next/link";

/**
 * Desktop landing — full-viewport hero matching Landing page 1.png
 *
 * Background photo (no baked-in UI): public/images/hero-landing-page3.jpg
 * Layout reference: public/images/Landing page 1.png
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
      className="pointer-events-none absolute left-1/2 top-[46%] -z-0 h-[min(62vh,620px)] w-[min(56vw,560px)] -translate-x-1/2 -translate-y-1/2"
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
      className={`${spaceGrotesk.className} relative box-border h-dvh min-h-dvh w-full overflow-hidden bg-[#020617] text-white antialiased`}
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      {/* Full-bleed hero photo — cover fills viewport without stretch */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative hero, object-fit cover */}
      <img
        src="/images/hero-landing-page3.jpg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 box-border h-full w-full object-cover object-center"
      />
      {/* Soft vignette so overlays stay readable without washing the photo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/20 via-transparent to-black/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/25 via-transparent to-black/12"
      />

      {/* All UI overlays sit above the photo */}
      <div className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col box-border px-8 pb-7 pt-7 sm:px-12 xl:px-16">
        {/* Nav */}
        <header className="relative z-20 flex h-12 shrink-0 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <TriangleLogo className="text-white" />
            <span className="text-[21px] font-semibold tracking-tight">
              Ema<span style={{ color: ACCENT }}>X</span>
            </span>
          </Link>

          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 md:flex lg:gap-10">
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
            className="inline-flex h-[38px] items-center rounded-full border border-white/85 px-5 text-[11px] font-medium tracking-[0.22em] text-white transition hover:bg-white/10 sm:px-6"
          >
            SIGN IN&nbsp;&nbsp;→
          </Link>
        </header>

        {/* Stage — flex-1 keeps bottom footer inside the viewport */}
        <main className="relative z-10 min-h-0 flex-1">
          <p className="absolute left-1/2 top-[8%] -translate-x-1/2 text-center text-[10px] font-medium tracking-[0.45em] text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)] sm:text-[11px]">
            AI ASSISTANT FOR TRADES
          </p>

          <HeroTriangle />

          {/* Center stack: wordmark + CTA sit on the triangle */}
          <div className="absolute left-1/2 top-[44%] flex w-full -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <h1 className="select-none text-[clamp(42px,9vw,92px)] font-medium leading-none tracking-[0.32em] text-white sm:tracking-[0.4em]">
              <span className="-mr-[0.05em]">E</span>
              <span className="mx-[0.02em]">M</span>
              <span className="mx-[0.02em] inline-block translate-y-[-0.03em]">
                Λ
              </span>
              <span className="ml-[0.02em]" style={{ color: ACCENT }}>
                X
              </span>
            </h1>

            <div className="mt-[clamp(72px,18vh,180px)] flex flex-col items-center">
              <Link
                href="/signup"
                className="group relative flex h-[64px] w-[64px] items-center justify-center rounded-full transition hover:scale-[1.05] sm:h-[74px] sm:w-[74px]"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, rgba(186,230,253,0.55) 0%, rgba(56,189,248,0.22) 42%, rgba(14,165,233,0.12) 70%, rgba(8,47,73,0.18) 100%)",
                  border: "1.5px solid rgba(186,230,253,0.85)",
                  boxShadow:
                    "0 0 0 1px rgba(125,211,252,0.35) inset, 0 0 22px rgba(56,189,248,0.55), 0 0 48px rgba(56,189,248,0.35), 0 0 80px rgba(14,165,233,0.2)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                }}
                aria-label="Click to enter"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-[6px] rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 40% 28%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 35%, transparent 65%)",
                  }}
                />
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                >
                  <path
                    d="M9 6L15 12L9 18"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <p className="mt-3.5 text-[10px] font-medium tracking-[0.36em] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]">
                CLICK TO ENTER
              </p>
            </div>
          </div>

          {/* Right copy */}
          <div className="absolute right-0 top-[28%] hidden w-[min(360px,32vw)] text-right md:block xl:right-4">
            <h2 className="text-[clamp(28px,3.2vw,48px)] font-medium leading-[1.15] tracking-[-0.025em]">
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
            <p className="mt-6 text-[10px] font-medium tracking-[0.28em] text-white/90 sm:mt-8 sm:text-[11px] sm:tracking-[0.3em]">
              PLAN&nbsp;&nbsp;/&nbsp;&nbsp;QUOTE&nbsp;&nbsp;/&nbsp;&nbsp;MANAGE&nbsp;&nbsp;/&nbsp;&nbsp;GET
              PAID
            </p>
          </div>
        </main>

        {/* Bottom — shrink-0 so it never gets pushed under the fold */}
        <footer className="relative z-20 grid shrink-0 grid-cols-[1fr] items-end gap-4 pt-2 sm:grid-cols-[120px_1fr_100px] sm:gap-6 lg:grid-cols-[160px_1fr_140px]">
          <div className="hidden items-center gap-2.5 pb-2 sm:flex">
            <span className="h-[2px] w-7 rounded-full bg-white" />
            <span className="h-[5px] w-[5px] rounded-full bg-white/75" />
            <span className="h-[5px] w-[5px] rounded-full bg-white/75" />
            <span className="h-[5px] w-[5px] rounded-full bg-white/75" />
            <span className="h-[5px] w-[5px] rounded-full bg-white/75" />
            <span className="ml-5 h-[5px] w-[5px] rounded-full bg-white/45" />
          </div>

          <div
            id="features"
            className="flex items-start justify-center gap-6 sm:gap-12 lg:gap-16 xl:gap-24"
          >
            {FEATURES.map((item) => (
              <div key={item.num} className="min-w-0 sm:min-w-[130px]">
                <p className="text-[13px] font-medium tracking-wide text-white sm:text-[15px]">
                  <span className="mr-2 tabular-nums text-white sm:mr-2.5">
                    {item.num}
                  </span>
                  {item.title}
                </p>
                <p className="mt-1 pl-[1.7rem] text-[11px] text-white/50 sm:pl-[2.1rem] sm:text-[13px]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="hidden justify-end pb-3 sm:flex">
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
