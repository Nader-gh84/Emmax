"use client";

import { touchBtnSecondary } from "@/components/quotes/ui";
import {
  type AppNotification,
  formatNotificationTime,
} from "@/types/notification";
import { formatCurrency } from "@/types/quote";

function typeLabel(type: string): string {
  switch (type) {
    case "draft_quote":
      return "Draft Pre-Invoice";
    case "employee_clock":
      return "Employee Clock";
    default:
      return "Notification";
  }
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-sm text-slate-200 sm:text-right">{value}</dd>
    </div>
  );
}

function DraftSummary({ notification }: { notification: AppNotification }) {
  const meta = notification.metadata ?? {};
  const rawGrandTotal = meta.grand_total as unknown;
  const grandTotal =
    typeof rawGrandTotal === "number"
      ? formatCurrency(rawGrandTotal)
      : typeof rawGrandTotal === "string" && rawGrandTotal.trim()
        ? rawGrandTotal
        : null;

  return (
    <dl className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <SummaryRow
        label="Quote #"
        value={
          typeof meta.quote_number === "string" ? meta.quote_number : null
        }
      />
      <SummaryRow
        label="Customer"
        value={
          typeof meta.customer_name === "string" ? meta.customer_name : null
        }
      />
      <SummaryRow
        label="Project"
        value={
          typeof meta.project_name === "string" ? meta.project_name : null
        }
      />
      <SummaryRow label="Amount" value={grandTotal} />
    </dl>
  );
}

function EmployeeClockSummary({
  notification,
}: {
  notification: AppNotification;
}) {
  const meta = notification.metadata ?? {};
  return (
    <dl className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <SummaryRow label="Details" value={notification.message} />
      <SummaryRow
        label="Employee"
        value={
          typeof meta.employee_name === "string"
            ? meta.employee_name
            : typeof meta.employee === "string"
              ? meta.employee
              : null
        }
      />
      <SummaryRow
        label="Action"
        value={
          typeof meta.action === "string"
            ? meta.action
            : typeof meta.clock_action === "string"
              ? meta.clock_action
              : null
        }
      />
      <SummaryRow
        label="Time"
        value={
          typeof meta.clock_time === "string"
            ? meta.clock_time
            : typeof meta.time === "string"
              ? meta.time
              : null
        }
      />
    </dl>
  );
}

function GenericSummary({ notification }: { notification: AppNotification }) {
  const meta = notification.metadata ?? {};
  const entries = Object.entries(meta).filter(([, value]) => {
    if (value == null) return false;
    if (typeof value === "string") return Boolean(value.trim());
    if (typeof value === "number" || typeof value === "boolean") return true;
    return false;
  });

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
        No additional details for this notification.
      </div>
    );
  }

  return (
    <dl className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
      {entries.map(([key, value]) => (
        <SummaryRow
          key={key}
          label={key.replace(/_/g, " ")}
          value={String(value)}
        />
      ))}
    </dl>
  );
}

/** Summary modal for draft_quote, employee_clock, and unknown types (not quotes/materials). */
export function NotificationSummaryModal({
  notification,
  onClose,
}: {
  notification: AppNotification;
  onClose: () => void;
}) {
  const title = typeLabel(notification.type);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {title}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {notification.message}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {formatNotificationTime(notification.created_at)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="mt-6">
          {notification.type === "draft_quote" ? (
            <DraftSummary notification={notification} />
          ) : notification.type === "employee_clock" ? (
            <EmployeeClockSummary notification={notification} />
          ) : (
            <GenericSummary notification={notification} />
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`${touchBtnSecondary} w-full sm:w-auto`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
