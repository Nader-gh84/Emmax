"use client";

import {
  MaterialItem,
  calculateQuoteTotals,
  formatCurrency,
  materialLineTotal,
} from "@/types/quote";

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
  onDownload: () => void;
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
  onDownload,
  onSaveDraft,
}: StepPreviewProps) {
  const { subtotal, tax, grandTotal } = calculateQuoteTotals(
    materials,
    taxRate
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-white">Preview & send</h2>
      <p className="mt-2 text-sm text-slate-400">
        Review your quote before sending to the customer.
      </p>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-lg font-bold text-white">EmaX Quote</p>
            <p className="mt-1 text-sm text-slate-400">
              Valid for {validityDays} days
            </p>
          </div>
          <p className="text-2xl font-bold text-accent">
            {formatCurrency(grandTotal)}
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Customer
            </p>
            <p className="mt-1 font-medium text-white">{customerName}</p>
            <p className="text-sm text-slate-400">{customerEmail}</p>
            {customerPhone && (
              <p className="text-sm text-slate-400">{customerPhone}</p>
            )}
          </div>
          {projectName && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Project
              </p>
              <p className="mt-1 font-medium text-white">{projectName}</p>
            </div>
          )}
        </div>

        {notes && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Scope of work
            </p>
            <p className="mt-1 text-sm text-slate-300">{notes}</p>
          </div>
        )}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium">Qty</th>
                <th className="pb-2 font-medium">Unit</th>
                <th className="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((item) => (
                <tr key={item.id} className="border-b border-white/5">
                  <td className="py-2 text-white">{item.item}</td>
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

        <div className="mt-4 ml-auto max-w-xs space-y-2 text-sm">
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

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onSend}
          disabled={isSending}
          className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Sending..." : "Send Quote"}
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10"
        >
          Download PDF
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10"
        >
          Save as Draft
        </button>
      </div>
    </div>
  );
}
