"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  IconBell,
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconMicrophone,
  IconTruck,
} from "@/components/dashboard/icons";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import {
  formatAgendaMoney,
  formatAgendaTime,
  type TodayAgendaItem,
  type TodayAgendaViewModel,
} from "@/lib/today-agenda";
import { formatNotificationTime } from "@/types/notification";
import {
  scheduleTaskTypeLabel,
  type ScheduleTaskType,
} from "@/types/schedule-item";

type TaskFilter = "all" | ScheduleTaskType;

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "project_task", label: "Projects" },
  { id: "pickup", label: "Pickup" },
  { id: "delivery", label: "Delivery" },
  { id: "site_visit", label: "Site visit" },
  { id: "call", label: "Calls" },
  { id: "payment_reminder", label: "Payments" },
  { id: "personal", label: "Personal" },
];

const SUGGESTED_PHRASES = [
  "Mark the site visit as done",
  "Reschedule pickup to 3 PM",
  "Add a personal task for dinner at 7",
];

function typeAccent(type: ScheduleTaskType): string {
  switch (type) {
    case "pickup":
    case "delivery":
      return "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30";
    case "site_visit":
    case "inspection":
      return "bg-violet-500/15 text-violet-300 ring-violet-500/30";
    case "call":
      return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    case "payment_reminder":
      return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
    case "personal":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "project_task":
      return "bg-accent/15 text-accent ring-accent/30";
    default:
      return "bg-white/10 text-slate-300 ring-white/15";
  }
}

function statusLabel(status: TodayAgendaItem["status"]): string {
  switch (status) {
    case "completed":
      return "Done";
    case "overdue":
      return "Overdue";
    case "in_progress":
      return "In progress";
    case "cancelled":
      return "Cancelled";
    default:
      return "Open";
  }
}

export function TodayPage({ agenda }: { agenda: TodayAgendaViewModel }) {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [briefStarted, setBriefStarted] = useState(false);

  const filteredItems = useMemo(() => {
    if (filter === "all") return agenda.items;
    if (filter === "pickup") {
      return agenda.items.filter(
        (item) => item.taskType === "pickup" || item.taskType === "delivery"
      );
    }
    return agenda.items.filter((item) => item.taskType === filter);
  }, [agenda.items, filter]);

  const dateLabel = useMemo(() => {
    const date = new Date(`${agenda.dateKey}T12:00:00`);
    return date.toLocaleDateString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [agenda.dateKey]);

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-white/10 bg-[#0B1220]/80 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              Daily Command Center
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Today
            </h1>
            <p className="mt-1 text-sm text-slate-400">{dateLabel}</p>
          </div>
          <p className="text-sm text-slate-400">
            Hi {agenda.greetingName} —{" "}
            <span className="font-medium text-slate-200">
              {agenda.summary.openToday} open
            </span>
            {agenda.summary.completedToday > 0
              ? ` · ${agenda.summary.completedToday} done`
              : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-accent/15 via-white/[0.04] to-transparent p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                  Daily Brief
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Good day, {agenda.greetingName}
                </h2>
              </div>
              <button
                type="button"
                className={touchBtnPrimary}
                onClick={() => setBriefStarted(true)}
              >
                {briefStarted ? "Brief ready" : "Start Brief"}
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {agenda.briefLines.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-slate-300">
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Voice playback comes in the next chunk — press Start Brief to
              preview the script for now.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Up Next
              </h2>
              <IconClock className="h-4 w-4 text-slate-500" />
            </div>
            {agenda.upNext.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Nothing queued — your next hours look clear.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {agenda.upNext.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white">
                        {item.title}
                      </p>
                      <p className="shrink-0 text-xs font-semibold text-accent">
                        {formatAgendaTime(item.scheduledStart)}
                      </p>
                    </div>
                    {item.subtitle ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                Today&apos;s Tasks
              </h2>
              <span className="text-xs text-slate-500">
                {filteredItems.length} shown
              </span>
            </div>

            <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
              {FILTERS.map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-accent/20 text-accent ring-1 ring-accent/40"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {filteredItems.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">
                No items in this filter for today. Add a personal task or check
                project due dates.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
                {filteredItems.map((item) => (
                  <AgendaRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  My Calendar
                </h2>
                <IconCalendar className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-1 text-xs text-slate-500">This week</p>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {agenda.week.map((day) => (
                  <div
                    key={day.dateKey}
                    className={`rounded-xl px-1 py-2 text-center ${
                      day.isToday
                        ? "bg-accent/20 ring-1 ring-accent/40"
                        : "bg-white/[0.02]"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase text-slate-500">
                      {day.weekday}
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        day.isToday ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {day.label}
                    </p>
                    <div className="mt-2 flex justify-center gap-0.5">
                      {Array.from({
                        length: Math.min(day.itemCount, 3),
                      }).map((_, index) => (
                        <span
                          key={index}
                          className={`h-1.5 w-1.5 rounded-full ${
                            day.isToday ? "bg-accent" : "bg-slate-500"
                          }`}
                        />
                      ))}
                      {day.itemCount === 0 ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Alerts & Updates
                </h2>
                <IconBell className="h-4 w-4 text-slate-500" />
              </div>
              {agenda.alerts.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No recent alerts. Inbox is quiet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {agenda.alerts.slice(0, 5).map((alert) => (
                    <li key={alert.id} className="min-w-0">
                      <p className="text-sm text-slate-200 line-clamp-2">
                        {alert.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatNotificationTime(alert.created_at)}
                        {!alert.read ? " · Unread" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/dashboard/inbox"
                className="mt-4 inline-flex text-xs font-semibold text-accent hover:text-blue-400"
              >
                Open Inbox →
              </Link>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Daily Summary
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <SummaryMetric
                  label="Open"
                  value={String(agenda.summary.openToday)}
                />
                <SummaryMetric
                  label="Done"
                  value={String(agenda.summary.completedToday)}
                />
                <SummaryMetric
                  label="Pickups"
                  value={String(agenda.summary.pickupsCount)}
                  icon={<IconTruck className="h-3.5 w-3.5" />}
                />
                <SummaryMetric
                  label="Payments due"
                  value={
                    agenda.summary.paymentsDueCount > 0
                      ? formatAgendaMoney(agenda.summary.paymentsDueAmount)
                      : "—"
                  }
                />
              </dl>
            </section>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-white/10 bg-[#0B1220]/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30"
            aria-label="Push to talk"
            title="Push-to-talk — voice commands coming next"
          >
            <IconMicrophone className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Voice command
            </p>
            <div className="mt-1.5 flex gap-2 overflow-x-auto pb-0.5">
              {SUGGESTED_PHRASES.map((phrase) => (
                <span
                  key={phrase}
                  className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300"
                >
                  “{phrase}”
                </span>
              ))}
            </div>
          </div>
          <button type="button" className={`${touchBtnSecondary} shrink-0`} disabled>
            Hold mic to talk
          </button>
        </div>
      </div>
    </div>
  );
}

function AgendaRow({ item }: { item: TodayAgendaItem }) {
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${typeAccent(
            item.taskType
          )}`}
        >
          {scheduleTaskTypeLabel(item.taskType)}
        </span>
        <span className="text-xs text-slate-500">
          {formatAgendaTime(item.scheduledStart)}
        </span>
        {item.status === "completed" ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
            <IconCheckCircle className="h-3.5 w-3.5" />
            {statusLabel(item.status)}
          </span>
        ) : item.status === "overdue" ? (
          <span className="text-xs font-semibold text-red-300">Overdue</span>
        ) : null}
      </div>
      <p className="mt-1.5 text-sm font-medium text-white">{item.title}</p>
      {item.subtitle ? (
        <p className="mt-0.5 text-xs text-slate-400">{item.subtitle}</p>
      ) : null}
      {typeof item.meta?.amount === "number" ? (
        <p className="mt-1 text-xs font-semibold text-amber-200">
          {formatAgendaMoney(item.meta.amount)}
        </p>
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          className="block px-4 py-3 transition hover:bg-white/[0.04]"
        >
          {body}
        </Link>
      </li>
    );
  }

  return <li className="px-4 py-3">{body}</li>;
}

function SummaryMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
      <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-white">{value}</dd>
    </div>
  );
}
