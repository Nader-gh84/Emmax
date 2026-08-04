"use client";

import { QuotePreviewBody } from "@/components/quotes/quote-preview-body";
import { touchBtnSecondary } from "@/components/quotes/ui";
import { formatAvailabilityLabel } from "@/types/material-order";
import {
  type AppNotification,
  formatNotificationTime,
} from "@/types/notification";
import {
  type Quote,
  type StoredMaterial,
  formatCurrency,
  formatQuoteDate,
  storedToMaterials,
} from "@/types/quote";

function typeLabel(type: string): string {
  switch (type) {
    case "draft_quote":
      return "Draft Pre-Invoice";
    case "quote_accepted":
      return "Quote Accepted";
    case "quote_declined":
      return "Quote Declined";
    case "supplier_price":
      return "Supplier Pricing";
    case "materials_confirmed":
      return "Materials Confirmed";
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

function MetadataSummary({ notification }: { notification: AppNotification }) {
  const meta = notification.metadata ?? {};
  const availability = formatAvailabilityLabel(
    typeof meta.availability_date === "string" ? meta.availability_date : null,
    typeof meta.availability_time === "string" ? meta.availability_time : null
  );

  const rawGrandTotal = meta.grand_total as unknown;
  const grandTotal =
    typeof rawGrandTotal === "number"
      ? formatCurrency(rawGrandTotal)
      : typeof rawGrandTotal === "string" && rawGrandTotal.trim()
        ? rawGrandTotal
        : null;

  const rawItemCount = meta.item_count as unknown;
  const itemCount =
    typeof rawItemCount === "number"
      ? String(rawItemCount)
      : typeof rawItemCount === "string"
        ? rawItemCount
        : null;

  if (notification.type === "materials_confirmed") {
    return (
      <dl className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
        <SummaryRow
          label="Supplier"
          value={
            typeof meta.supplier_name === "string" ? meta.supplier_name : null
          }
        />
        <SummaryRow
          label="Project"
          value={
            typeof meta.project_name === "string" ? meta.project_name : null
          }
        />
        <SummaryRow
          label="Ready"
          value={availability !== "—" ? availability : null}
        />
        <SummaryRow
          label="Branch / Pickup"
          value={
            typeof meta.branch_location === "string"
              ? meta.branch_location
              : null
          }
        />
      </dl>
    );
  }

  if (notification.type === "employee_clock") {
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

  if (notification.type === "supplier_price") {
    return (
      <dl className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
        <SummaryRow
          label="Supplier"
          value={
            typeof meta.supplier_name === "string" ? meta.supplier_name : null
          }
        />
        <SummaryRow
          label="Email"
          value={
            typeof meta.supplier_email === "string" ? meta.supplier_email : null
          }
        />
        <SummaryRow label="Items" value={itemCount} />
        <SummaryRow
          label="Customer"
          value={
            typeof meta.customer_name === "string" ? meta.customer_name : null
          }
        />
      </dl>
    );
  }

  // draft_quote / quote_accepted / quote_declined / unknown — metadata summary
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
      <SummaryRow
        label="Decline reason"
        value={
          typeof meta.decline_reason === "string" ? meta.decline_reason : null
        }
      />
      <SummaryRow
        label="Supplier"
        value={
          typeof meta.supplier_name === "string" ? meta.supplier_name : null
        }
      />
    </dl>
  );
}

function QuoteStatusLine({ quote }: { quote: Quote }) {
  if (quote.status === "accepted") {
    return (
      <>
        Accepted{" "}
        {quote.confirmed_at ? formatQuoteDate(quote.confirmed_at) : "—"}
      </>
    );
  }
  if (quote.status === "declined") {
    return (
      <>
        Declined {quote.declined_at ? formatQuoteDate(quote.declined_at) : "—"}
      </>
    );
  }
  if (quote.status === "sent") {
    return <>Sent {quote.sent_at ? formatQuoteDate(quote.sent_at) : "—"}</>;
  }
  return <>Draft</>;
}

export function NotificationSummaryModal({
  notification,
  quote,
  isLoadingQuote = false,
  onClose,
}: {
  notification: AppNotification;
  quote?: Quote | null;
  isLoadingQuote?: boolean;
  onClose: () => void;
}) {
  const title = typeLabel(notification.type);
  const showQuoteBody = Boolean(quote);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {title}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {quote?.project_name?.trim() ||
                (typeof notification.metadata?.project_name === "string" &&
                notification.metadata.project_name.trim()
                  ? notification.metadata.project_name
                  : null) ||
                notification.message}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {quote ? (
                <QuoteStatusLine quote={quote} />
              ) : (
                formatNotificationTime(notification.created_at)
              )}
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

        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {notification.message}
        </p>

        <div className="mt-6">
          {isLoadingQuote ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-sm text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
              Loading details…
            </div>
          ) : showQuoteBody && quote ? (
            <QuotePreviewBody
              customerName={quote.customer_name ?? ""}
              customerEmail={quote.customer_email ?? ""}
              customerPhone={quote.customer_phone ?? ""}
              projectName={quote.project_name ?? ""}
              notes={quote.notes ?? ""}
              validityDays={quote.validity_days}
              materials={storedToMaterials(quote.materials as StoredMaterial[])}
              subtotal={Number(quote.subtotal)}
              tax={Number(quote.tax)}
              grandTotal={Number(quote.grand_total)}
              taxRate={Number(quote.tax_rate)}
            />
          ) : (
            <MetadataSummary notification={notification} />
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
