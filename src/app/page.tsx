import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const painPoints = [
  "Spending hours writing quotes after a long day",
  "Losing jobs because quotes arrive too late",
  "Chasing customers for follow-ups manually",
];

const steps = [
  {
    number: "1",
    title: "Visit the job site",
    description: "Take notes the way you always do",
  },
  {
    number: "2",
    title: "Speak to EmaX",
    description: "Describe the materials and scope of work out loud",
  },
  {
    number: "3",
    title: "Quote sent",
    description: "Professional PDF delivered to your customer instantly",
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

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-navy text-white">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 py-24 sm:py-32">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.15)_0%,_transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl">
            <div className="flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
              <div className="order-2 text-center lg:order-1 lg:text-left">
                <p className="mb-6 inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
                  AI-powered quotes for Canadian trades
                </p>
                <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
                  Stop Doing Paperwork.{" "}
                  <span className="text-accent">Start Doing More Jobs.</span>
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl lg:mx-0">
                  EmaX turns your voice into professional quotes in seconds. Built
                  for Canadian tradespeople.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                  <Link
                    href="/signup"
                    className="w-full rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600 sm:w-auto"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
                  >
                    See How It Works
                  </Link>
                </div>
              </div>

              <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
                <Image
                  src="/images/hero-assistant.png"
                  alt="Ema, your AI quote assistant"
                  width={520}
                  height={520}
                  priority
                  className="h-auto w-full max-w-xs rounded-2xl shadow-2xl shadow-accent/25 ring-1 ring-accent/20 sm:max-w-sm lg:max-w-md"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-white/10 px-6 py-20">
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
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              3 steps to your first quote
            </h2>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="relative text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-white shadow-lg shadow-accent/30">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {step.description}
                  </p>
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
                      <svg
                        className="h-4 w-4 shrink-0 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
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
