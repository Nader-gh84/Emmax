"use client";

import { useState } from "react";
import {
  MaterialItem,
  calculateQuoteTotals,
  formatCurrency,
  materialLineTotal,
} from "@/types/quote";
import { touchBtnPrimary, touchBtnSecondary } from "@/components/quotes/ui";

interface StepPreviewProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  notes: string;
  validityDays: number;
  materials: MaterialItem[];
  taxRate: number;
  onSend: () => void | Promise<void>;
  isSending?: boolean;
  onSaveDraft: () => void;
}

export function StepPreview({
  customerName,
  customerEmail,
  customerPhone,
  projectName,
  notes,
  validityDays,
  materials,
  taxRate,
  onSend,
  isSending = false,
  onSaveDraft,
}: StepPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { subtotal, tax, grandTotal } = calculateQuoteTotals(
    materials,
    taxRate
  );

  async function handleDownloadPdf() {
    setIsDownloading(true);
    setPdfError(null);

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          projectName,
          notes,
          validityDays,
          taxRate,
          materials: materials.map(({ item, quantity, unit, unitPrice }) => ({
            item,
            quantity,
            unit,
            unitPrice,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "quote.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "Failed to generate PDF"
      );
    } finally {
      setIsDownloading(false);
    }
  }

  const preview = (
    <QuotePreviewBody
      customerName={customerName}
      customerEmail={customerEmail}
      customerPhone={customerPhone}
      projectName={projectName}
      notes={notes}
      validityDays={validityDays}
      materials={materials}
      subtotal={subtotal}
      tax={tax}
      grandTotal={grandTotal}
      taxRate={taxRate}
    />
  );

  const controls = (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onSend}
        disabled={isSending}
        className={`${touchBtnPrimary} w-full`}
      >
        {isSending ? "Sending..." : "Send Quote"}
      </button>
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={isDownloading}
        className={`${touchBtnSecondary} w-full disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isDownloading ? "Generating PDF..." : "Download PDF"}
      </button>
      <button type="button" onClick={onSaveDraft} className={`${touchBtnSecondary} w-full`}>
        Save as Draft
      </button>
    </div>
  );

  return (
    <div className="min-w-0">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">
        Preview & send
      </h2>
      <p className="mt-2 text-base text-slate-400">
        Review your quote before sending to the customer.
      </p>

      {pdfError && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
          {pdfError}
        </div>
      )}

      {/* Mobile: scrollable preview + sticky bottom send */}
      <div className="mt-6 lg:hidden">
        <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {preview}
        </div>
        <div className="sticky bottom-20 z-40 mt-4 space-y-3 rounded-2xl border border-white/10 bg-navy/95 p-4 backdrop-blur-md">
          <button
            type="button"
            onClick={onSend}
            disabled={isSending}
            className={`${touchBtnPrimary} w-full`}
          >
            {isSending ? "Sending..." : "Send Quote"}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className={`${touchBtnSecondary} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isDownloading ? "Generating PDF..." : "Download PDF"}
          </button>
          <button type="button" onClick={onSaveDraft} className={`${touchBtnSecondary} w-full`}>
            Save as Draft
          </button>
        </div>
      </div>

      {/* Desktop: 60/40 split */}
      <div className="mt-6 hidden gap-8 lg:grid lg:grid-cols-5">
        <div className="lg:col-span-3">{preview}</div>
        <div className="lg:col-span-2">
          <div className="sticky top-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="mb-4 text-base font-semibold text-white">Send controls</p>
            {controls}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuotePreviewBody({
  customerName,
  customerEmail,
  customerPhone,
  projectName,
  notes,
  validityDays,
  materials,
  subtotal,
  tax,
  grandTotal,
  taxRate,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  notes: string;
  validityDays: number;
  materials: MaterialItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  taxRate: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 lg:border-0 lg:bg-transparent lg:p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <p className="text-lg font-bold text-white">EmaX Quote</p>
          <p className="mt-1 text-base text-slate-400">
            Valid for {validityDays} days
          </p>
        </div>
        <p className="text-2xl font-bold text-accent">
          {formatCurrency(grandTotal)}
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Customer
          </p>
          <p className="mt-1 break-words text-base font-medium text-white">
            {customerName}
          </p>
          <p className="break-all text-base text-slate-400">{customerEmail}</p>
          {customerPhone && (
            <p className="text-base text-slate-400">{customerPhone}</p>
          )}
        </div>
        {projectName && (
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Project
            </p>
            <p className="mt-1 break-words text-base font-medium text-white">
              {projectName}
            </p>
          </div>
        )}
      </div>

      {notes && (
        <div className="mt-4 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Scope of work
          </p>
          <p className="mt-1 break-words text-base text-slate-300">{notes}</p>
        </div>
      )}

      {/* Mobile line items */}
      <div className="mt-6 space-y-3 md:hidden">
        {materials.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-2 border-b border-white/5 pb-3"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words text-base text-white">{item.item}</p>
              <p className="text-sm text-slate-400">
                {item.quantity} {item.unit}
              </p>
            </div>
            <p className="shrink-0 text-base text-white">
              {formatCurrency(materialLineTotal(item))}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto md:block">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-400">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium">Qty</th>
              <th className="pb-2 font-medium">Unit</th>
              <th className="pb-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((item) => (
              <tr key={item.id} className="border-b border-white/5">
                <td className="break-words py-2 text-white">{item.item}</td>
                <td className="py-2 text-slate-300">{item.quantity}</td>
                <td className="py-2 text-slate-300">{item.unit}</td>
                <td className="py-2 text-right text-white">
                  {formatCurrency(materialLineTotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 ml-auto max-w-xs space-y-2 text-base">
        <div className="flex justify-between text-slate-400">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Tax ({taxRate}%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
          <span>Grand Total</span>
          <span className="text-accent">{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
