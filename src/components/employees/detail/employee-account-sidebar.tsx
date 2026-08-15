"use client";

import {
  formatEmployeeDate,
  formatEmployeeMoney,
  type EmployeeDetailsViewModel,
  type LabourPayment,
} from "@/lib/employee-details";
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
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#14263D]">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Outstanding
          </span>
          <span className="text-sm font-bold text-white">
            {formatEmployeeMoney(total)}
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
            {formatEmployeeMoney(current)}
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
            {formatEmployeeMoney(overdue)}
            <span className="ml-1 text-xs font-normal text-slate-500">
              ({Math.round(overduePct)}%)
            </span>
          </span>
        </li>
      </ul>
    </div>
  );
}

export function EmployeeAccountSidebar({
  summary,
  payments,
  onViewAllPayments,
  onRecordPayment,
}: {
  summary: EmployeeDetailsViewModel["summary"];
  payments: LabourPayment[];
  onViewAllPayments: () => void;
  onRecordPayment: () => void;
}) {
  const recent = payments.slice(0, 4);

  const rows: { label: string; value: string; tone?: "danger" | "warn" }[] = [
    {
      label: "Total Labour Cost",
      value: formatEmployeeMoney(summary.totalLabourCost),
    },
    {
      label: "Total Paid",
      value: formatEmployeeMoney(summary.totalPaid),
    },
    {
      label: "Outstanding Balance",
      value: formatEmployeeMoney(summary.outstandingBalance),
      tone: summary.outstandingBalance > 0 ? "danger" : undefined,
    },
    {
      label: "Overdue Amount",
      value: formatEmployeeMoney(summary.overdueAmount),
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
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Outstanding Split
        </h2>
        <div className="mt-4">
          <OutstandingDonut
            current={Math.max(0, summary.currentOutstanding)}
            overdue={summary.overdueAmount}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Unconfirmed pay-period invoices are excluded until confirmed.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Recent Payments
          </h2>
          {payments.length > 0 ? (
            <button
              type="button"
              onClick={onViewAllPayments}
              className="text-xs font-semibold text-accent transition hover:text-blue-400"
            >
              View all
            </button>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No payments recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recent.map((payment) => (
              <li
                key={payment.id}
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {payment.paymentNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {payment.method} · {formatEmployeeDate(payment.paidAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {formatEmployeeMoney(payment.amount)}
                  </span>
                  {payment.hasReceipt ? (
                    <span
                      className="text-cyan-400/80"
                      title="Receipt on file"
                      aria-label="Receipt on file"
                    >
                      <IconReceipt className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
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

export function EmployeePaymentsPlaceholder({
  payments,
  onRecordPayment,
}: {
  payments: LabourPayment[];
  onRecordPayment?: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Account-level labour payments for this employee.
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
                  {payment.method} · {formatEmployeeDate(payment.paidAt)}
                </p>
              </div>
              <p className="text-sm font-semibold text-white">
                {formatEmployeeMoney(payment.amount)}
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
