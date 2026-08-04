"use client";

import { QuotePreviewBody } from "@/components/quotes/quote-preview-body";
import { touchBtnSecondary } from "@/components/quotes/ui";
import type { LabourItem, MaterialItem } from "@/types/quote";

export function InProgressQuoteSummaryModal({
  customerName,
  customerEmail,
  customerPhone,
  projectName,
  notes,
  validityDays,
  materials,
  labourItems,
  subtotal,
  tax,
  grandTotal,
  taxRate,
  quoteNumber,
  onClose,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  notes: string;
  validityDays: number;
  materials: MaterialItem[];
  labourItems: LabourItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  taxRate: number;
  quoteNumber?: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Project Summary
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {projectName.trim() || quoteNumber || "Current project"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Read-only preview before you save, send, or continue editing.
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
          <QuotePreviewBody
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            projectName={projectName}
            notes={notes}
            validityDays={validityDays}
            materials={materials}
            labourItems={labourItems}
            subtotal={subtotal}
            tax={tax}
            grandTotal={grandTotal}
            taxRate={taxRate}
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
