"use client";

import {
  formatSupplierMoney,
  type SupplierDetailsViewModel,
} from "@/lib/supplier-details-mock";

function IconCart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
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

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SupplierSummaryCards({
  summary,
}: {
  summary: SupplierDetailsViewModel["summary"];
}) {
  const cards = [
    {
      id: "purchases",
      label: "Total Purchases",
      value: formatSupplierMoney(summary.totalPurchases),
      hint: "All-time invoice volume",
      icon: <IconCart className="h-5 w-5" />,
      valueClass: "text-white",
      iconClass: "bg-accent/15 text-accent ring-accent/30",
    },
    {
      id: "paid",
      label: "Total Paid",
      value: formatSupplierMoney(summary.totalPaid),
      hint: "Payments recorded",
      icon: <IconCheck className="h-5 w-5" />,
      valueClass: "text-emerald-300",
      iconClass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    },
    {
      id: "outstanding",
      label: "Outstanding Balance",
      value: formatSupplierMoney(summary.outstandingBalance),
      hint: `Overdue: ${formatSupplierMoney(summary.overdueAmount)}`,
      icon: <IconBalance className="h-5 w-5" />,
      valueClass: "text-red-300",
      iconClass: "bg-red-500/15 text-red-300 ring-red-500/30",
      hintClass: "text-red-300/80",
    },
    {
      id: "last",
      label: "Last Payment",
      value: summary.lastPaymentAmount
        ? formatSupplierMoney(summary.lastPaymentAmount)
        : "—",
      hint: formatDate(summary.lastPaymentDate),
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
