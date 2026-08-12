import Link from "next/link";
import MarketingShell, {
  MarketingEyebrow,
  MarketingHeroPhoto,
} from "@/components/marketing/MarketingShell";
import {
  ArrowRightIcon,
  CrownIcon,
} from "@/components/marketing/marketing-icons";
import {
  MarketingButton,
  MarketingCheckList,
} from "@/components/marketing/marketing-ui";
import { MARKETING_ACCENT } from "@/lib/marketing-tokens";

const HERO_BENEFITS = [
  { title: "Quick setup", description: "Get started in minutes", icon: "⚡" },
  { title: "Voice-first", description: "Talk, I'll handle the rest", icon: "🎙" },
  { title: "Secure & Private", description: "Your data stays yours", icon: "🔒" },
] as const;

const PRO_FEATURES = [
  "Voice material lists",
  "Supplier RFQ & inbox",
  "Smart pre-invoices",
  "Customer quotes & approvals",
  "Project management",
  "Employee & hours tracking",
  "Supplier accounting",
  "Customer payments",
  "Today dashboard",
  "Voice commands",
  "PDF quotes",
  "Priority support",
] as const;

const TEAMS_FEATURES = [
  "Everything in Pro",
  "Multiple team members",
  "Advanced permissions",
  "Dedicated onboarding",
  "Custom integrations",
] as const;

const TRUST_ITEMS = [
  { title: "Cancel Anytime", icon: "✓" },
  { title: "Safe & Secure", icon: "🛡" },
  { title: "Real Human Support", icon: "💬" },
  { title: "Always Improving", icon: "↗" },
] as const;

function PricingPlanCard({
  badge,
  title,
  price,
  priceNote,
  features,
  cta,
  ctaHref,
  ctaVariant = "primary",
  footer,
  featured = false,
}: {
  badge?: string;
  title: string;
  price: string;
  priceNote?: string;
  features: readonly string[];
  cta: string;
  ctaHref: string;
  ctaVariant?: "primary" | "outline";
  footer?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border p-6 lg:p-8 ${
        featured
          ? "border-sky-400 bg-white shadow-lg shadow-sky-100/80"
          : "border-slate-200 bg-slate-50/50"
      }`}
    >
      {badge ? (
        <span className="mb-4 inline-flex w-fit rounded-full bg-sky-500 px-3 py-1 text-[9px] font-medium tracking-[0.14em] text-white">
          {badge}
        </span>
      ) : null}
      <h2 className="text-xl font-medium text-slate-900">{title}</h2>
      <p className="mt-2 text-3xl font-medium tracking-tight text-slate-900">
        {price}
      </p>
      {priceNote ? (
        <p className="mt-1 text-sm text-slate-500">{priceNote}</p>
      ) : null}
      <div className="mt-6 flex-1">
        <MarketingCheckList items={[...features]} />
      </div>
      {featured ? (
        <div className="my-5 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-center text-sm text-slate-600">
          <strong className="font-medium text-slate-800">14-Day Free Trial</strong>
          <br />
          No credit card required
        </div>
      ) : null}
      <MarketingButton
        href={ctaHref}
        variant={ctaVariant}
        className="w-full text-center"
      >
        {cta}
      </MarketingButton>
      {footer ? (
        <p className="mt-3 text-center text-xs text-slate-500">{footer}</p>
      ) : null}
    </div>
  );
}

export default function PricingPageContent() {
  return (
    <MarketingShell activePage="pricing">
      {/* Hero */}
      <section className="mt-8 grid items-start gap-10 lg:mt-10 lg:grid-cols-2 lg:gap-12">
        <div>
          <MarketingEyebrow>PRICING</MarketingEyebrow>
          <h1 className="mt-4 text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Less paperwork.
            <br />
            More time to{" "}
            <span style={{ color: MARKETING_ACCENT }}>build.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
            I handle the busy work so you can focus on what really matters.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {HERO_BENEFITS.map((b) => (
              <div key={b.title} className="text-center sm:text-left">
                <span className="text-lg" aria-hidden>
                  {b.icon}
                </span>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {b.title}
                </p>
                <p className="text-xs text-slate-500">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
        <MarketingHeroPhoto className="min-h-[240px] sm:min-h-[300px]" />
      </section>

      {/* Founding Crew */}
      <section className="mt-12 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-6 lg:mt-14 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <CrownIcon />
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.2em] text-sky-600">
                  FOUNDING CREW · 20 SPOTS ONLY
                </p>
                <h2 className="text-lg font-medium text-slate-900">
                  Help shape EmaX. Get EmaX free for life.
                </h2>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Join my early user program — test features, share feedback, and
              lock in lifetime access at no cost.
            </p>
            <Link
              href="/about"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-500 hover:text-sky-600"
            >
              How it works <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <div className="mt-5 max-w-md">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>18 / 20 spots claimed</span>
              </div>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 flex-1 rounded-sm ${
                      i < 18 ? "bg-sky-500" : "bg-sky-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-white p-5 text-center shadow-sm lg:min-w-[200px]">
            <p className="text-sm text-slate-500">Spots left:</p>
            <p className="text-4xl font-medium text-sky-500">2</p>
            <p className="mt-1 text-xs text-slate-500">Don&apos;t miss it!</p>
            <MarketingButton href="/signup" className="mt-4 w-full">
              GET STARTED FREE
            </MarketingButton>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="mt-12 grid gap-6 lg:mt-14 lg:grid-cols-2 lg:gap-8">
        <PricingPlanCard
          featured
          badge="FULL EMAX EXPERIENCE"
          title="EmaX Pro"
          price="$29 CAD / month"
          features={PRO_FEATURES}
          cta="START FREE TRIAL"
          ctaHref="/signup"
          footer="Cancel anytime. No commitment."
        />
        <PricingPlanCard
          title="EmaX Teams"
          price="Custom"
          priceNote="Flexible plans for teams of any size."
          features={TEAMS_FEATURES}
          cta="TALK TO US"
          ctaHref="/faq"
          ctaVariant="outline"
          footer="We'll help you find the right plan."
        />
      </section>

      {/* Waitlist */}
      <section className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-6 py-5 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            ⏳
          </span>
          <div>
            <p className="font-medium text-slate-800">
              Missed the first 20?
            </p>
            <p className="text-sm text-slate-500">
              You may still have a chance.
            </p>
          </div>
        </div>
        <MarketingButton href="/signup" variant="outline">
          REQUEST FOUNDING ACCESS
        </MarketingButton>
      </section>

      {/* Trust */}
      <section className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex flex-col items-center rounded-xl px-3 py-4 text-center"
          >
            <span className="text-xl" aria-hidden>
              {item.icon}
            </span>
            <p className="mt-2 text-xs font-medium tracking-wide text-slate-600">
              {item.title}
            </p>
          </div>
        ))}
      </section>

      {/* FAQ footer */}
      <section className="mt-12 flex flex-col items-center justify-between gap-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row lg:mt-14">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero-landing-page3.jpg"
              alt=""
              className="h-full w-full object-cover object-top"
            />
          </div>
          <p className="max-w-md text-sm text-slate-600">
            Got questions before starting? Check out the FAQ or send me a
            message.
          </p>
        </div>
        <MarketingButton href="/faq" variant="outline">
          VIEW FAQ <ArrowRightIcon />
        </MarketingButton>
      </section>
    </MarketingShell>
  );
}
