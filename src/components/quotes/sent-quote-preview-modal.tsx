"use client";

import { QuotePreviewBody } from "@/components/quotes/quote-preview-body";
import { touchBtnSecondary } from "@/components/quotes/ui";
import { storedToLabourItems } from "@/lib/quotes";
import {
  Quote,
  StoredLabourItem,
  StoredMaterial,
  formatQuoteDate,
  storedToMaterials,
} from "@/types/quote";

function getQuoteTitle(quote: Quote): string {
  return quote.project_name?.trim() || "Untitled quote";
}

function StatusBadge({ status }: { status: Quote["status"] }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-emerald-400">
        Accepted
      </span>
    );
  }

  if (status === "declined") {
    return (
      <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-red-300">
        Declined
      </span>
    );
  }

  if (status === "sent") {
    return (
      <span className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-green-400">
        Sent
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-amber-300">
      Draft
    </span>
  );
}

export function SentQuotePreviewModal({
  quote,
  onClose,
}: {
  quote: Quote;
  onClose: () => void;
}) {
  const materials = storedToMaterials(quote.materials as StoredMaterial[]);
  const labourItems = storedToLabourItems(
    (quote.labour_items as StoredLabourItem[] | undefined) ?? []
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {getQuoteTitle(quote)}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {quote.status === "accepted"
                ? `Accepted ${quote.confirmed_at ? formatQuoteDate(quote.confirmed_at) : "—"}`
                : quote.status === "declined"
                  ? `Declined ${quote.declined_at ? formatQuoteDate(quote.declined_at) : "—"}`
                  : `Sent ${quote.sent_at ? formatQuoteDate(quote.sent_at) : "—"}`}
            </p>
          </div>
          <StatusBadge status={quote.status} />
        </div>

        <div className="mt-6">
          <QuotePreviewBody
            customerName={quote.customer_name ?? ""}
            customerEmail={quote.customer_email ?? ""}
            customerPhone={quote.customer_phone ?? ""}
            projectName={quote.project_name ?? ""}
            notes={quote.notes ?? ""}
            validityDays={quote.validity_days}
            materials={materials}
            labourItems={labourItems}
            subtotal={Number(quote.subtotal)}
            tax={Number(quote.tax)}
            grandTotal={Number(quote.grand_total)}
            taxRate={Number(quote.tax_rate)}
          />
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
