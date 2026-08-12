import Link from "next/link";
import {
  BrainIcon,
  ChartIcon,
  LightningIcon,
  ShieldCheckIcon,
} from "@/components/marketing/marketing-icons";
import { ABOUT } from "@/lib/about-design-tokens";
import AboutFeatureCard from "./AboutFeatureCard";

const CARDS = [
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

export default function AboutFeatureGrid() {
  return (
    <section
      className="relative px-5 pb-20 pt-10 md:px-8 lg:px-[72px] lg:pb-24 lg:pt-12"
      style={{ backgroundColor: ABOUT.bgLight }}
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {CARDS.map((card) => (
            <AboutFeatureCard key={card.title} {...card} />
          ))}
        </div>

        {/* Decorative dots — bottom left */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-10 left-8 hidden grid-cols-6 gap-2 opacity-50 md:grid lg:left-[72px]"
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: ABOUT.blueLight }}
            />
          ))}
        </div>

        {/* Decorative arrow — bottom right */}
        <div className="mt-12 flex justify-end lg:mt-8">
          <Link
            href="/features"
            aria-label="Continue to Features"
            className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
            style={{
              background: ABOUT.gradientAccent,
              boxShadow: "0 8px 24px rgba(36,99,255,0.35)",
            }}
          >
            →
          </Link>
        </div>
      </div>
    </section>
  );
}
