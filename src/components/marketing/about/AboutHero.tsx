import Link from "next/link";
import { ABOUT, ABOUT_ASSETS } from "@/lib/about-design-tokens";
import { PlayCircleIcon } from "@/components/marketing/marketing-icons";

export default function AboutHero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ minHeight: ABOUT.heroHeightDesktop }}
    >
      {/* Vancouver background — full hero atmosphere */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ABOUT_ASSETS.background}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[72%_center]"
        draggable={false}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/92 to-white/25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#EDF4FF]/40 via-transparent to-[#F6F9FF]/80"
      />

      <div className="relative mx-auto grid h-full max-w-[1440px] items-center px-5 py-12 md:px-8 lg:grid-cols-[40%_1fr] lg:gap-8 lg:px-[72px] lg:py-0">
        {/* Left copy */}
        <div className="z-10 lg:py-16">
          <p
            className="text-[11px] font-semibold tracking-[0.18em]"
            style={{ color: ABOUT.blue }}
          >
            ABOUT EMAX
          </p>
          <h1
            className="mt-5 text-[40px] font-normal leading-[1.08] tracking-tight sm:text-[48px] lg:text-[56px]"
            style={{ color: ABOUT.textPrimary }}
          >
            Built for trades.
            <br />
            Backed by{" "}
            <span style={{ color: ABOUT.blue }}>AI.</span>
          </h1>
          <div className="mt-6 flex gap-4">
            <span
              aria-hidden
              className="mt-1 w-px shrink-0 self-stretch min-h-[4.5rem]"
              style={{ backgroundColor: ABOUT.blue }}
            />
            <p
              className="max-w-md text-[17px] leading-[1.6] lg:text-[18px]"
              style={{ color: ABOUT.textSecondary }}
            >
              EmaX is an AI assistant designed specifically for trades
              professionals. I help you plan, quote, manage and get paid — all in
              one smart place.
            </p>
          </div>
          <Link
            href="/login"
            className="mt-9 inline-flex h-[52px] items-center gap-3 rounded-full border px-6 text-[13px] font-medium tracking-[0.06em] transition hover:-translate-y-0.5 hover:bg-[#EDF4FF] hover:shadow-md"
            style={{ borderColor: ABOUT.blue, color: ABOUT.textPrimary }}
          >
            <PlayCircleIcon className="text-[#2463FF]" />
            See EmaX in action
          </Link>
        </div>

        {/* Right — Emma + subtle triangle */}
        <div className="relative mt-8 min-h-[320px] lg:mt-0 lg:min-h-[480px]">
          {/* Inverted triangle brand element */}
          <svg
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[8%] -z-0 h-[min(420px,85%)] w-[min(380px,90%)] -translate-x-1/2 opacity-[0.1]"
            viewBox="0 0 380 420"
            fill="none"
          >
            <path
              d="M190 24 L356 396 L24 396 Z"
              stroke={ABOUT.blueLight}
              strokeWidth="1.5"
            />
          </svg>
          {/* Emma — positioned from hero-landing-page3 (woman + laptop) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ABOUT_ASSETS.emma}
            alt="Ema, AI assistant for trades"
            className="absolute bottom-0 right-0 h-[105%] max-h-[520px] w-auto max-w-none object-contain object-bottom object-left lg:-right-8"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}
