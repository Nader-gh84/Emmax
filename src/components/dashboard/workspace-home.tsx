import Link from "next/link";
import {
  IconCalendar,
  IconDocument,
  IconEmployee,
  IconSettings,
  IconSuppliers,
  IconUsers,
} from "@/components/dashboard/icons";
import {
  IconMore,
  IconProjects,
  IconSend,
  IconTrendUp,
} from "@/components/dashboard/workspace-icons";
import { WorkspaceCustomersPanel } from "@/components/dashboard/workspace-customers-panel";

function buildStatCards(activeProjectsCount: number) {
  return [
    {
      label: "Customers",
      value: "128",
      trend: "+12%",
      icon: IconUsers,
    },
    {
      label: "Suppliers",
      value: "46",
      trend: "+4%",
      icon: IconSuppliers,
    },
    {
      label: "Quotes",
      value: "87",
      trend: "+18%",
      icon: IconDocument,
    },
    {
      label: "Active Projects",
      value: String(activeProjectsCount),
      trend: "Live",
      icon: IconProjects,
    },
  ];
}

const DETAIL_ROWS = [
  [
    {
      title: "Customer",
      href: "/dashboard/customers",
      icon: IconUsers,
      stats: [
        { label: "Total", value: "128" },
        { label: "Active", value: "96" },
        { label: "New this month", value: "14" },
      ],
    },
    {
      title: "Supplier",
      href: "/dashboard/suppliers",
      icon: IconSuppliers,
      stats: [
        { label: "Total", value: "46" },
        { label: "Preferred", value: "12" },
        { label: "Orders open", value: "8" },
      ],
    },
    {
      title: "Projects",
      href: "/dashboard/projects",
      icon: IconProjects,
      stats: [
        { label: "Draft", value: "11" },
        { label: "Sent", value: "29" },
        { label: "Accepted", value: "47" },
      ],
    },
  ],
  [
    {
      title: "Employee",
      href: "/dashboard/settings?section=employees",
      icon: IconEmployee,
      stats: [
        { label: "Team size", value: "9" },
        { label: "On site", value: "6" },
        { label: "Available", value: "3" },
      ],
    },
    {
      title: "Advanced Setting",
      href: "/dashboard/settings",
      icon: IconSettings,
      stats: [
        { label: "Tax rate", value: "13%" },
        { label: "Validity", value: "30d" },
        { label: "Profile", value: "Complete" },
      ],
    },
    {
      title: "Calendar",
      href: "/dashboard/calendar",
      icon: IconCalendar,
      stats: [
        { label: "Today", value: "3 jobs" },
        { label: "This week", value: "14" },
        { label: "Next up", value: "2:30 PM" },
      ],
    },
  ],
];

function formatTodayLabel() {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface WorkspaceHomeProps {
  firstName: string;
  activeProjectsCount?: number;
}

export function WorkspaceHome({
  firstName,
  activeProjectsCount = 0,
}: WorkspaceHomeProps) {
  const displayName = firstName || "there";
  const statCards = buildStatCards(activeProjectsCount);

  return (
    <div className="flex min-h-full min-w-0 flex-1">
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Today&apos;s Workspace
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            <IconCalendar className="h-4 w-4 text-cyan-400" />
            {formatTodayLabel()}
          </button>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    <IconTrendUp className="h-3.5 w-3.5" />
                    {stat.trend}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-400">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </section>

        {DETAIL_ROWS.map((row, rowIndex) => (
          <section
            key={rowIndex}
            className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {row.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="text-base font-semibold text-white">
                        {card.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
                      aria-label={`${card.title} menu`}
                    >
                      <IconMore className="h-4 w-4" />
                    </button>
                  </div>

                  <dl className="mt-5 space-y-3">
                    {card.stats.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-b-0 last:pb-0"
                      >
                        <dt className="text-sm text-slate-400">{item.label}</dt>
                        <dd className="text-sm font-semibold text-white">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <Link
                    href={card.href}
                    className="mt-5 inline-flex text-sm font-semibold text-accent transition hover:text-blue-400"
                  >
                    View all →
                  </Link>
                </div>
              );
            })}
          </section>
        ))}

        <section className="mt-6 mb-2 overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/20 via-white/[0.04] to-cyan-500/10 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-cyan-400 text-base font-bold text-white shadow-lg shadow-accent/30">
                Ema
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {greetingForNow()}, {displayName}
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Ready to quote faster? Ask Ema or jump into today&apos;s work.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "3 quotes due",
                    "2 follow-ups",
                    "1 job starting",
                  ].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/10 bg-navy/40 px-3 py-1 text-xs font-medium text-slate-300"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-navy/50 p-2">
            <input
              type="text"
              placeholder="Ask Ema anything..."
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
              readOnly
              aria-label="Ask Ema anything"
            />
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-blue-600"
              aria-label="Send message"
            >
              <IconSend className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      <WorkspaceCustomersPanel />
    </div>
  );
}
