"use client";

import Link from "next/link";
import { useEmCall } from "@/components/em-call/em-call-provider";
import {
  IconCalendar,
  IconDocument,
  IconEmployee,
  IconSettings,
  IconSuppliers,
  IconUsers,
} from "@/components/dashboard/icons";
import {
  IconProjects,
  IconSend,
} from "@/components/dashboard/workspace-icons";
import { WorkspaceCustomersPanel } from "@/components/dashboard/workspace-customers-panel";
import { unlockTtsAudio } from "@/lib/tts-audio-bus";
import type { DashboardMetrics } from "@/lib/dashboard-metrics";

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

function buildStatCards(metrics: DashboardMetrics) {
  return [
    {
      label: "Customers",
      value: String(metrics.customersTotal),
      icon: IconUsers,
    },
    {
      label: "Suppliers",
      value: String(metrics.suppliersTotal),
      icon: IconSuppliers,
    },
    {
      label: "Quotes",
      value: String(metrics.quotesTotal),
      icon: IconDocument,
    },
    {
      label: "Active Projects",
      value: String(metrics.projectsActive),
      icon: IconProjects,
    },
  ];
}

function buildDetailRows(metrics: DashboardMetrics) {
  return [
    [
      {
        title: "Customer",
        href: "/dashboard/customers",
        icon: IconUsers,
        stats: [
          { label: "Total", value: String(metrics.customersTotal) },
          { label: "Active", value: String(metrics.customersActive) },
          {
            label: "New this month",
            value: String(metrics.customersNewThisMonth),
          },
        ],
      },
      {
        title: "Supplier",
        href: "/dashboard/suppliers",
        icon: IconSuppliers,
        stats: [
          { label: "Total", value: String(metrics.suppliersTotal) },
          { label: "Orders open", value: String(metrics.ordersOpen) },
        ],
      },
      {
        title: "Projects",
        href: "/dashboard/projects",
        icon: IconProjects,
        stats: [
          { label: "Active", value: String(metrics.projectsActive) },
          { label: "On hold", value: String(metrics.projectsOnHold) },
          { label: "Completed", value: String(metrics.projectsCompleted) },
        ],
      },
    ],
    [
      {
        title: "Employee",
        href: "/dashboard/employees",
        icon: IconEmployee,
        stats: [
          { label: "Team size", value: String(metrics.employeesTotal) },
        ],
      },
      {
        title: "Advanced Setting",
        href: "/dashboard/settings",
        icon: IconSettings,
        stats: [
          { label: "Tax rate", value: metrics.taxRateLabel },
          { label: "Validity", value: metrics.validityLabel },
          { label: "Profile", value: metrics.profileLabel },
        ],
      },
      {
        title: "Calendar",
        href: "/dashboard/calendar",
        icon: IconCalendar,
        stats: [
          {
            label: "Today",
            value:
              metrics.scheduleToday === 1
                ? "1 item"
                : `${metrics.scheduleToday} items`,
          },
          { label: "This week", value: String(metrics.scheduleThisWeek) },
          { label: "Next up", value: metrics.nextUpLabel },
        ],
      },
    ],
  ];
}

interface WorkspaceHomeProps {
  firstName: string;
  metrics: DashboardMetrics;
}

export function WorkspaceHome({ firstName, metrics }: WorkspaceHomeProps) {
  const { startCall } = useEmCall();
  const displayName = firstName || "there";
  const statCards = buildStatCards(metrics);
  const detailRows = buildDetailRows(metrics);

  function openEmCall() {
    unlockTtsAudio();
    startCall();
  }

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
          <Link
            href="/dashboard/today"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            <IconCalendar className="h-4 w-4 text-cyan-400" />
            {formatTodayLabel()}
          </Link>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-3xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-400">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </section>

        {detailRows.map((row, rowIndex) => (
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
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      {card.title}
                    </h2>
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
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-cyan-400 text-base font-bold text-white shadow-lg shadow-accent/30">
              Ema
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {greetingForNow()}, {displayName}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Ready to quote faster? Start an Em Call with Ema.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-navy/50 p-2">
            <button
              type="button"
              onClick={openEmCall}
              className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              aria-label="Ask Ema — start Em Call"
            >
              Ask Ema anything…
            </button>
            <button
              type="button"
              onClick={openEmCall}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-blue-600"
              aria-label="Start Em Call with Ema"
            >
              <IconSend className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      <WorkspaceCustomersPanel customers={metrics.recentCustomers} />
    </div>
  );
}
