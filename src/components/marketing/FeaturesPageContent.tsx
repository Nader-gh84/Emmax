import Link from "next/link";
import MarketingShell, {
  MarketingEyebrow,
  MarketingHeroPhoto,
  MarketingSectionLabel,
} from "@/components/marketing/MarketingShell";
import {
  BriefcaseIcon,
  CheckCircleIcon,
  DocumentIcon,
  DollarIcon,
  FolderIcon,
  InboxIcon,
  ListIcon,
  MicIcon,
  PieIcon,
  RefreshIcon,
  SendIcon,
  TriangleLogo,
  TruckIcon,
  UsersIcon,
  WaveformIcon,
} from "@/components/marketing/marketing-icons";
import { MarketingCard } from "@/components/marketing/marketing-ui";
import { MARKETING_ACCENT } from "@/lib/marketing-tokens";

const WORKFLOW = [
  { label: "Voice List", icon: MicIcon },
  { label: "Supplier Pricing", icon: TruckIcon },
  { label: "Pre-Invoice", icon: DocumentIcon },
  { label: "Customer Confirm", icon: CheckCircleIcon },
  { label: "Project Created", icon: FolderIcon },
  { label: "Done", icon: BriefcaseIcon },
] as const;

const AVAILABLE_FEATURES = [
  {
    num: "01",
    title: "Voice Material List",
    description: "Speak your list — I'll organize it for you.",
    tag: "+ VOICE POWERED",
    icon: MicIcon,
  },
  {
    num: "02",
    title: "Send to Suppliers",
    description: "One click to request pricing from your suppliers.",
    tag: "+ AUTOMATED",
    icon: SendIcon,
  },
  {
    num: "03",
    title: "Supplier Inbox",
    description: "All supplier responses in one organized place.",
    tag: "ORGANIZED",
    icon: InboxIcon,
  },
  {
    num: "04",
    title: "Confirm & Create Pre-Invoice",
    description: "Review pricing and create your pre-invoice instantly.",
    tag: "ONE CLICK",
    icon: DocumentIcon,
  },
  {
    num: "05",
    title: "Send to Customer",
    description: "Share quotes with customers easily.",
    tag: "EASY SHARE",
    icon: SendIcon,
  },
  {
    num: "06",
    title: "Customer Confirm",
    description: "Track approvals in real time.",
    tag: "REAL-TIME",
    icon: CheckCircleIcon,
  },
  {
    num: "07",
    title: "Project Created",
    description: "Approved quotes become projects automatically.",
    tag: "AUTO SETUP",
    icon: BriefcaseIcon,
  },
  {
    num: "08",
    title: "Track & Complete",
    description: "Monitor progress from start to finish.",
    tag: "STAY IN CONTROL",
    icon: BriefcaseIcon,
  },
] as const;

const CAPABILITIES = [
  { title: "Employees & Hours", description: "Track your team", icon: UsersIcon },
  {
    title: "Supplier Accounting",
    description: "Manage what you owe",
    icon: DollarIcon,
  },
  {
    title: "Customer & Payments",
    description: "Know what's outstanding",
    icon: DocumentIcon,
  },
  { title: "Today - Your Day", description: "Your daily command center", icon: ListIcon },
] as const;

const COMING_SOON = [
  {
    title: "Smart Material Returns",
    description: "Track unused materials and returns automatically.",
    icon: RefreshIcon,
  },
  {
    title: "Smarter Voice Assistant",
    description: "Even more natural conversations with Ema.",
    icon: WaveformIcon,
  },
  {
    title: "Advanced Business Insights",
    description: "See trends and make smarter decisions.",
    icon: PieIcon,
  },
] as const;

function FeatureTag({ children }: { children: string }) {
  return (
    <span className="mt-auto inline-flex rounded-full border border-sky-300/80 px-3 py-1 text-[9px] font-medium tracking-[0.12em] text-sky-600">
      {children}
    </span>
  );
}

export default function FeaturesPageContent() {
  return (
    <MarketingShell activePage="features">
      {/* Hero */}
      <section className="mt-8 grid items-start gap-10 lg:mt-10 lg:grid-cols-2 lg:gap-12">
        <div>
          <MarketingEyebrow>FEATURES</MarketingEyebrow>
          <h1 className="mt-4 text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            One assistant.{" "}
            <span style={{ color: MARKETING_ACCENT }}>Your whole workflow.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
            From the first material list to the final payment, I handle
            everything for your trades business.
          </p>
        </div>
        <MarketingHeroPhoto className="min-h-[240px] sm:min-h-[300px]" />
      </section>

      {/* Workflow strip */}
      <section
        aria-label="Workflow overview"
        className="mt-10 flex gap-3 overflow-x-auto pb-2 lg:mt-12 lg:justify-center"
      >
        {WORKFLOW.map((step, i) => (
          <div key={step.label} className="flex shrink-0 items-center gap-3">
            <div className="flex w-[88px] flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-500">
                <step.icon />
              </div>
              <span className="text-[10px] font-medium tracking-wide text-slate-500">
                {step.label}
              </span>
            </div>
            {i < WORKFLOW.length - 1 ? (
              <span className="text-slate-300" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        ))}
      </section>

      <MarketingSectionLabel>AVAILABLE NOW</MarketingSectionLabel>

      {/* Feature grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {AVAILABLE_FEATURES.map((feature) => (
          <Link key={feature.num} href="/login" className="block h-full">
            <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
                  <feature.icon />
                </div>
                <span className="text-xs tabular-nums text-slate-400">
                  {feature.num}
                </span>
              </div>
              <h2 className="mt-4 text-[15px] font-medium text-slate-900">
                {feature.title}
              </h2>
              <p className="mt-1.5 flex-1 text-sm text-slate-500">
                {feature.description}
              </p>
              <FeatureTag>{feature.tag}</FeatureTag>
            </div>
          </Link>
        ))}
      </section>

      {/* Capability row */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((cap) => (
          <Link
            key={cap.title}
            href="/login"
            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 transition hover:border-sky-200 hover:bg-sky-50/50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sky-500 shadow-sm">
              <cap.icon />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{cap.title}</p>
              <p className="text-xs text-slate-500">{cap.description}</p>
            </div>
          </Link>
        ))}
      </section>

      <MarketingSectionLabel>COMING NEXT</MarketingSectionLabel>

      <section className="grid gap-5 md:grid-cols-3">
        {COMING_SOON.map((item) => (
          <MarketingCard key={item.title}>
            <item.icon className="text-sky-500" />
            <h2 className="mt-4 text-lg font-medium text-slate-900">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{item.description}</p>
            <span className="mt-4 inline-flex rounded-full border border-sky-300/60 px-3 py-1 text-[9px] font-medium tracking-[0.12em] text-sky-500">
              + COMING SOON
            </span>
          </MarketingCard>
        ))}
      </section>

      {/* Footer banner */}
      <section className="mt-14 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-8 lg:mt-16 lg:p-10">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-sky-300 bg-white text-sky-500 shadow-md shadow-sky-200/50">
            <TriangleLogo className="scale-150" />
          </div>
          <div>
            <h2 className="text-2xl font-medium text-slate-900">
              And I&apos;m just getting started.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              20+ more capabilities are already on my roadmap. More automation.
              More intelligence. Less work for you.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
