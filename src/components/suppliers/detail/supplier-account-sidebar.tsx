"use client";

import {
  formatSupplierDate,
  formatSupplierMoney,
  type SupplierDetailsViewModel,
  type SupplierPayment,
} from "@/lib/supplier-details-mock";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";

function IconReceipt({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
    </svg>
  );
}

function IconPayment({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function OutstandingDonut({
  current,
  overdue,
}: {
  current: number;
  overdue: number;
}) {
  const total = current + overdue;
  const overduePct = total > 0 ? (overdue / total) * 100 : 0;
  const currentPct = total > 0 ? 100 - overduePct : 100;
  // Conic gradient ring (no chart library).
  const gradient =
    total <= 0
      ? "conic-gradient(#334155 0deg 360deg)"
      : `conic-gradient(#ef4444 0deg ${overduePct * 3.6}deg, #22d3ee ${overduePct * 3.6}deg 360deg)`;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div
        className="relative h-28 w-28 shrink-0 rounded-full p-2"
        style={{ background: gradient }}
        aria-hidden="true"
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#0B1220]">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Outstanding
          </span>
          <span className="text-sm font-bold text-white">
            {formatSupplierMoney(total)}
          </span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        <li className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            Current
          </span>
          <span className="font-semibold text-white">
            {formatSupplierMoney(current)}
            <span className="ml-1 text-xs font-normal text-slate-500">
              ({Math.round(currentPct)}%)
            </span>
          </span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            Overdue
          </span>
          <span className="font-semibold text-red-300">
            {formatSupplierMoney(overdue)}
            <span className="ml-1 text-xs font-normal text-slate-500">
              ({Math.round(overduePct)}%)
            </span>
          </span>
        </li>
      </ul>
    </div>
  );
}

export function SupplierAccountSidebar({
  summary,
  payments,
  onViewAllPayments,
  onRecordPayment,
}: {
  summary: SupplierDetailsViewModel["summary"];
  payments: SupplierPayment[];
  onViewAllPayments: () => void;
  onRecordPayment: () => void;
}) {
  const recent = payments.slice(0, 4);
  const minMonthly = summary.minimumMonthlyPayment;
  const minProgress =
    minMonthly != null && minMonthly > 0
      ? Math.min(100, (summary.paidThisMonth / minMonthly) * 100)
      : null;

  const rows: { label: string; value: string; tone?: "danger" | "warn" }[] = [
    {
      label: "Total Purchases",
      value: formatSupplierMoney(summary.totalPurchases),
    },
    {
      label: "Total Paid",
      value: formatSupplierMoney(summary.totalPaid),
    },
    {
      label: "Outstanding Balance",
      value: formatSupplierMoney(summary.outstandingBalance),
      tone: summary.outstandingBalance > 0 ? "danger" : undefined,
    },
    {
      label: "Overdue Amount",
      value: formatSupplierMoney(summary.overdueAmount),
      tone: summary.overdueAmount > 0 ? "danger" : undefined,
    },
    {
      label: "Total Invoices",
      value: String(summary.totalInvoices),
    },
    {
      label: "Pending review",
      value: String(summary.pendingReviewCount),
      tone: summary.pendingReviewCount > 0 ? "warn" : undefined,
    },
    {
      label: "Total Payments",
      value: String(summary.totalPayments),
    },
    {
      label: "Average Payment Days",
      value:
        summary.averagePaymentDays != null
          ? `${summary.averagePaymentDays} days`
          : "—",
    },
  ];

  if (summary.creditLimit != null) {
    rows.push({
      label: "Credit Limit",
      value: formatSupplierMoney(summary.creditLimit),
      tone:
        summary.creditStatus === "over"
          ? "danger"
          : summary.creditStatus === "approaching"
            ? "warn"
            : undefined,
    });
  }

  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Account Summary
        </h2>
        <dl className="mt-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-3"
            >
              <dt className="text-xs text-slate-500">{row.label}</dt>
              <dd
                className={`text-sm font-semibold ${
                  row.tone === "danger"
                    ? "text-red-300"
                    : row.tone === "warn"
                      ? "text-amber-200"
                      : "text-white"
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {minMonthly != null && minMonthly > 0 ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Minimum this month
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Paid {formatSupplierMoney(summary.paidThisMonth)} of{" "}
              {formatSupplierMoney(minMonthly)} minimum
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  (minProgress ?? 0) >= 100 ? "bg-emerald-400" : "bg-accent"
                }`}
                style={{ width: `${minProgress ?? 0}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Outstanding split
          </p>
          <OutstandingDonut
            current={Math.max(0, summary.currentOutstanding)}
            overdue={summary.overdueAmount}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Payment History
          </h2>
          {payments.length > 0 ? (
            <button
              type="button"
              onClick={onViewAllPayments}
              className="text-xs font-semibold text-accent hover:text-blue-400"
            >
              View All
            </button>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No payments recorded yet for this supplier.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {recent.map((payment) => (
              <li
                key={payment.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                  <IconPayment className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">
                      {payment.paymentNumber}
                    </p>
                    <p className="shrink-0 text-sm font-semibold text-white">
                      {formatSupplierMoney(payment.amount)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {payment.method} · {formatSupplierDate(payment.paidAt)}
                  </p>
                </div>
                {payment.hasReceipt ? (
                  <span
                    className="mt-0.5 text-slate-500"
                    title="Receipt on file"
                    aria-label="Receipt on file"
                  >
                    <IconReceipt className="h-4 w-4" />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onRecordPayment}
          className={`${touchBtnPrimary} mt-4 w-full text-sm`}
        >
          + Record Payment
        </button>
      </section>
    </aside>
  );
}

/** Thin list used when Payments tab is selected. */
export function SupplierPaymentsPlaceholder({
  payments,
  onRecordPayment,
}: {
  payments: SupplierPayment[];
  onRecordPayment?: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Account-level payments for this supplier.
      </p>
      {payments.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
          No payments yet.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {payment.paymentNumber}
                </p>
                <p className="text-xs text-slate-400">
                  {payment.method} · {formatSupplierDate(payment.paidAt)}
                </p>
              </div>
              <p className="text-sm font-semibold text-white">
                {formatSupplierMoney(payment.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onRecordPayment}
        className={`${touchBtnSecondary} text-sm`}
      >
        + Record Payment
      </button>
    </div>
  );
}
