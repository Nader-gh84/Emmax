import Link from "next/link";
import MarketingShell, {
  MarketingEyebrow,
  MarketingHeroPhoto,
} from "@/components/marketing/MarketingShell";
import {
  BrainIcon,
  ChartIcon,
  LightningIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
  SparkleIcon,
} from "@/components/marketing/marketing-icons";
import { MarketingButton, MarketingCard } from "@/components/marketing/marketing-ui";
import { MARKETING_ACCENT } from "@/lib/marketing-tokens";

const VALUE_CARDS = [
  {
    title: "Made for Trades",
    description:
      "Built for electricians, plumbers, HVAC pros, carpenters and general contractors.",
    icon: LightningIcon,
  },
  {
    title: "AI That Works",
    description:
      "I understand your workflow and turn your voice and data into action.",
    icon: BrainIcon,
  },
  {
    title: "All in One Place",
    description:
      "Projects, suppliers, customers, quotes, tasks and payments — everything connected.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Focus on Growth",
    description:
      "I take care of the busy work so you can focus on what really matters.",
    icon: ChartIcon,
  },
] as const;

export default function AboutPageContent() {
  return (
    <MarketingShell activePage="about">
      {/* Hero */}
      <section className="mt-8 grid items-center gap-10 lg:mt-12 lg:grid-cols-2 lg:gap-12">
        <div>
          <MarketingEyebrow>ABOUT EMAX</MarketingEyebrow>
          <h1 className="mt-4 text-4xl font-medium leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Built for trades.
            <br />
            Backed by{" "}
            <span style={{ color: MARKETING_ACCENT }}>AI.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
            EmaX is an AI assistant designed specifically for trades
            professionals. I help you plan, quote, manage and get paid — all in
            one smart place.
          </p>
          <MarketingButton
            href="/login"
            variant="outline"
            className="mt-8"
          >
            <PlayCircleIcon className="text-sky-500" />
            See EmaX in action
          </MarketingButton>
        </div>
        <MarketingHeroPhoto className="min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]" />
      </section>

      {/* Intro */}
      <section className="mx-auto mt-16 max-w-3xl text-center lg:mt-20">
        <div className="flex items-center justify-center gap-2 text-sky-400">
          <SparkleIcon />
          <SparkleIcon />
        </div>
        <p className="mt-4 text-lg leading-relaxed text-slate-600 sm:text-xl">
          I combine AI power with real-world trade experience to{" "}
          <strong className="font-medium text-slate-800">
            save you time, reduce mistakes
          </strong>{" "}
          and{" "}
          <strong className="font-medium text-slate-800">
            grow your business.
          </strong>
        </p>
      </section>

      {/* Value cards */}
      <section className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-6">
        {VALUE_CARDS.map((card) => (
          <MarketingCard key={card.title} href="/features">
            <card.icon className="text-sky-500" />
            <h2 className="mt-4 text-lg font-medium text-slate-900">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {card.description}
            </p>
          </MarketingCard>
        ))}

        {/* Decorative dots */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 left-0 hidden grid-cols-6 gap-2 opacity-40 sm:grid"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-sky-300" />
          ))}
        </div>
      </section>

      {/* Bottom arrow */}
      <div className="mt-16 flex justify-end lg:mt-20">
        <Link
          href="/features"
          aria-label="Continue to Features"
          className="group flex w-28 items-center"
        >
          <span className="h-px flex-1 bg-slate-400 group-hover:bg-sky-400" />
          <span className="pl-2 text-xl text-slate-600 group-hover:translate-x-0.5 group-hover:text-sky-500">
            →
          </span>
        </Link>
      </div>
    </MarketingShell>
  );
}
