"use client";

import {
  formatEmployeeDate,
  formatEmployeeMoney,
  type EmployeeDetailsViewModel,
} from "@/lib/employee-details";

function IconLabour({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconBalance({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function EmployeeSummaryCards({
  summary,
}: {
  summary: EmployeeDetailsViewModel["summary"];
}) {
  const outstandingTone =
    summary.outstandingBalance > 0
      ? "text-red-300"
      : summary.outstandingBalance < 0
        ? "text-emerald-300"
        : "text-white";

  const cards = [
    {
      id: "labour",
      label: "Total Labour Cost",
      value: formatEmployeeMoney(summary.totalLabourCost),
      hint:
        summary.pendingReviewCount > 0
          ? `${summary.pendingReviewCount} pending review (excluded)`
          : "Confirmed invoices only",
      icon: <IconLabour className="h-5 w-5" />,
      valueClass: "text-white",
      iconClass: "bg-accent/15 text-accent ring-accent/30",
    },
    {
      id: "paid",
      label: "Total Paid",
      value: formatEmployeeMoney(summary.totalPaid),
      hint: "Account-level payments",
      icon: <IconCheck className="h-5 w-5" />,
      valueClass: "text-emerald-300",
      iconClass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    },
    {
      id: "outstanding",
      label: "Outstanding Balance",
      value: formatEmployeeMoney(summary.outstandingBalance),
      hint:
        summary.overdueAmount > 0
          ? `Overdue: ${formatEmployeeMoney(summary.overdueAmount)}`
          : summary.outstandingBalance < 0
            ? "Credit balance (overpaid)"
            : "No overdue amount",
      icon: <IconBalance className="h-5 w-5" />,
      valueClass: outstandingTone,
      iconClass:
        summary.outstandingBalance > 0
          ? "bg-red-500/15 text-red-300 ring-red-500/30"
          : "bg-white/10 text-slate-300 ring-white/15",
      hintClass:
        summary.overdueAmount > 0 ? "text-red-300/80" : "text-slate-500",
    },
    {
      id: "last",
      label: "Last Payment",
      value:
        summary.lastPaymentAmount != null
          ? formatEmployeeMoney(summary.lastPaymentAmount)
          : "—",
      hint: formatEmployeeDate(summary.lastPaymentDate),
      icon: <IconCalendar className="h-5 w-5" />,
      valueClass: "text-white",
      iconClass: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <section
          key={card.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${card.iconClass}`}
            >
              {card.icon}
            </span>
          </div>
          <p className={`mt-3 text-2xl font-bold tracking-tight ${card.valueClass}`}>
            {card.value}
          </p>
          <p className={`mt-1 text-xs ${card.hintClass ?? "text-slate-500"}`}>
            {card.hint}
          </p>
        </section>
      ))}
    </div>
  );
}
