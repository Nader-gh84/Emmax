import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const painPoints = [
  "Spending hours writing quotes after a long day",
  "Losing jobs because quotes arrive too late",
  "Chasing customers for follow-ups manually",
];

const howItWorksSteps = [
  {
    title: "You Speak",
    description: "Describe the job, materials, and scope out loud — no typing.",
    icon: "mic",
  },
  {
    title: "Ema Organizes",
    description: "Ema turns your voice into structured quote data instantly.",
    icon: "sparkle",
  },
  {
    title: "Review & Edit",
    description: "Fine-tune the quote, pricing, and customer details in seconds.",
    icon: "document",
  },
  {
    title: "Send & Win",
    description: "Email a professional PDF to your customer and move on.",
    icon: "send",
  },
];

const trustItems = [
  {
    label: "Built for Trades Worldwide",
    icon: "globe",
  },
  {
    label: "Voice → Quote in Minutes",
    icon: "mic",
  },
  {
    label: "Secure Cloud Platform",
    icon: "shield",
  },
];

const heroCheckmarks = [
  "No credit card",
  "30-second setup",
  "Cancel anytime",
];

const mockNavItems = [
  "Home",
  "New Quote",
  "Quotes",
  "Customers",
  "Suppliers",
  "Settings",
];

const mockFlowCards = [
  {
    label: "Listening...",
    detail: "Capturing job details from voice",
    active: true,
  },
  {
    label: "Generating Quote...",
    detail: "Organizing materials & labour",
    active: false,
  },
  {
    label: "Quote Ready",
    detail: "Example total: $2,450.00",
    active: false,
    complete: true,
  },
];

const testimonials = [
  {
    quote:
      "I used to spend my evenings typing up quotes. Now I just talk to EmaX in my truck and it's done before I pull out of the driveway.",
    name: "Mike R.",
    role: "Electrician",
    city: "Toronto",
  },
  {
    quote:
      "My close rate went up because I'm sending professional quotes the same day. Customers notice the difference.",
    name: "Sarah K.",
    role: "Plumber",
    city: "Vancouver",
  },
  {
    quote:
      "Between service calls I knock out three quotes with my voice. EmaX pays for itself in the first week.",
    name: "James T.",
    role: "HVAC Tech",
    city: "Calgary",
  },
];

const proFeatures = [
  "Unlimited quotes",
  "Voice input",
  "PDF generation",
  "Email delivery",
  "Customer management",
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StepIcon({ type }: { type: string }) {
  const className = "h-6 w-6 text-white";

  switch (type) {
    case "mic":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      );
    case "sparkle":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.2 3.6L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3zM18 14l0.8 2.4L21 17l-2.2 0.7L18 20l-0.8-2.3L15 17l2.2-0.7L18 14z" />
        </svg>
      );
    case "document":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "send":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    case "globe":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "shield":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    default:
      return null;
  }
}

function HeroDashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-accent/20 ring-1 ring-white/10">
        <Image
          src="/images/hero-assistant.png"
          alt="Ema, your AI quote assistant"
          width={640}
          height={640}
          priority
          className="h-auto w-full object-cover"
        />
        <div className="absolute inset-x-3 bottom-3 sm:inset-x-6 sm:bottom-6">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-navy/95 shadow-xl backdrop-blur-md">
            <div className="border-b border-white/10 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              UI Preview — Example Data
            </div>
            <div className="flex min-h-[220px]">
              <aside className="hidden w-[38%] border-r border-white/10 bg-white/[0.03] p-2 sm:block">
                <div className="space-y-1">
                  {mockNavItems.map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-md px-2 py-1.5 text-[10px] font-medium leading-tight ${
                        index === 1
                          ? "bg-accent text-white"
                          : "text-slate-400"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </aside>
              <div className="flex-1 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:hidden">
                  Voice → Quote Flow
                </p>
                <div className="space-y-2">
                  {mockFlowCards.map((card) => (
                    <div
                      key={card.label}
                      className={`rounded-lg border px-3 py-2 ${
                        card.complete
                          ? "border-green-500/30 bg-green-500/10"
                          : card.active
                            ? "border-accent/40 bg-accent/10"
                            : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            card.complete
                              ? "bg-green-400"
                              : card.active
                                ? "animate-pulse bg-accent"
                                : "bg-slate-600"
                          }`}
                        />
                        <p
                          className={`text-xs font-semibold ${
                            card.complete ? "text-green-400" : "text-white"
                          }`}
                        >
                          {card.label}
                        </p>
                      </div>
                      <p className="mt-1 pl-4 text-[10px] text-slate-400">
                        {card.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-navy text-white">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 py-16 sm:py-24 lg:py-28">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.15)_0%,_transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="text-center lg:text-left">
                <p className="mb-6 inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
                  AI Assistant for Contractors
                </p>
                <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  <span className="block text-white">Speak.</span>
                  <span className="block text-white">Ema builds the quote.</span>
                  <span className="block text-accent">You win the job.</span>
                </h1>
                <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0">
                  Turn your voice into professional quotes, material lists,
                  project notes, and client-ready documents in minutes. Built for
                  every trade. Designed to help you spend less time on paperwork
                  and more time growing your business.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                  <Link
                    href="/signup"
                    className="w-full rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600 sm:w-auto"
                  >
                    Start Free Trial →
                  </Link>
                </div>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
                  {heroCheckmarks.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-sm text-slate-400"
                    >
                      <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <HeroDashboardMockup />
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-white/10 bg-white/[0.02] px-6 py-10">
          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
            {trustItems.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <StepIcon type={item.icon} />
                </div>
                <p className="text-sm font-medium text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-white/10 px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Sound familiar?
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {painPoints.map((point, i) => (
                <div
                  key={point}
                  className="rounded-xl border border-white/10 bg-white/5 p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-sm font-bold text-red-400">
                    {i + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              How EmaX Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
              From voice memo to client-ready quote in four simple steps.
            </p>
            <div className="mt-16 flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-between md:gap-4">
              {howItWorksSteps.map((step, index) => (
                <div key={step.title} className="flex flex-col items-center md:flex-1">
                  <div className="flex w-full items-center justify-center">
                    {index > 0 && (
                      <div
                        aria-hidden="true"
                        className="hidden h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-accent/40 md:block"
                      />
                    )}
                    <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent shadow-lg shadow-accent/30">
                      <StepIcon type={step.icon} />
                    </div>
                    {index < howItWorksSteps.length - 1 && (
                      <div
                        aria-hidden="true"
                        className="hidden h-px flex-1 bg-gradient-to-r from-accent/40 via-accent/40 to-transparent md:block"
                      />
                    )}
                  </div>
                  <h3 className="mt-5 text-center text-lg font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[220px] text-center text-sm leading-relaxed text-slate-400">
                    {step.description}
                  </p>
                  {index < howItWorksSteps.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="mt-4 text-accent md:hidden"
                    >
                      ↓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="border-y border-white/10 bg-white/[0.02] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Trusted by Canadian tradespeople
            </h2>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {testimonials.map((t) => (
                <blockquote
                  key={t.name}
                  className="flex flex-col rounded-xl border border-white/10 bg-navy p-6"
                >
                  <p className="flex-1 text-sm leading-relaxed text-slate-300">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer className="mt-6 border-t border-white/10 pt-4">
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-sm text-slate-400">
                      {t.role}, {t.city}
                    </p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Simple, honest pricing
            </h2>
            <p className="mt-4 text-center text-slate-400">
              Start free. Upgrade when you&apos;re ready.
            </p>
            <div className="mt-16 grid gap-8 md:grid-cols-2">
              {/* Free Trial */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <h3 className="text-lg font-semibold text-slate-300">
                  Free Trial
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-slate-400">/ 14 days</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  No credit card required
                </p>
                <Link
                  href="/signup"
                  className="mt-8 block w-full rounded-lg border border-white/20 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Pro */}
              <div className="relative rounded-2xl border border-accent/50 bg-accent/5 p-8 ring-1 ring-accent/20">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">
                  Most Popular
                </span>
                <h3 className="text-lg font-semibold">Pro</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-slate-400">/ month</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Everything you need to run your business
                </p>
                <ul className="mt-6 space-y-3">
                  {proFeatures.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-slate-300"
                    >
                      <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block w-full rounded-lg bg-accent py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/20 to-accent/5 px-8 py-16 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Ready to save 5 hours a week?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              Join Canadian electricians, plumbers, and HVAC techs who quote
              faster with EmaX.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-lg bg-accent px-10 py-4 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600"
            >
              Start Free Trial
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
