"use client";

import {
  MaterialItem,
  calculateQuoteTotals,
  formatCurrency,
  materialLineTotal,
} from "@/types/quote";

interface QuoteLivePreviewProps {
  materials: MaterialItem[];
  taxRate: number;
  customerName?: string;
  projectName?: string;
  isPlaceholder?: boolean;
  className?: string;
}

export function QuoteLivePreview({
  materials,
  taxRate,
  customerName,
  projectName,
  isPlaceholder = false,
  className = "",
}: QuoteLivePreviewProps) {
  const { subtotal, tax, grandTotal } = calculateQuoteTotals(
    materials,
    taxRate
  );
  const hasRealData =
    !isPlaceholder &&
    materials.some((m) => m.item.trim() || m.unitPrice > 0);

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 ${className}`}
    >
      <div className="border-b border-white/10 pb-4">
        <p className="text-base font-bold text-white sm:text-lg">
          EmaX Quote Preview
        </p>
        <p className="mt-1 text-sm text-slate-400">Valid for 30 days</p>
      </div>

      <div className="mt-4 space-y-3">
        <PreviewField
          label="Customer"
          value={customerName || "Customer name"}
          placeholder={!customerName}
        />
        <PreviewField
          label="Project"
          value={projectName || "Project name"}
          placeholder={!projectName}
        />
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Line items
        </p>

        {isPlaceholder && !hasRealData ? (
          <>
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between rounded-lg border border-dashed border-white/15 px-3 py-3"
              >
                <div className="h-3 w-2/5 rounded bg-white/10" />
                <div className="h-3 w-12 rounded bg-white/10" />
              </div>
            ))}
          </>
        ) : (
          <div className={`space-y-2 ${hasRealData ? "animate-fade-in" : ""}`}>
            {materials.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base text-white">
                    {item.item || "Untitled item"}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {item.quantity} {item.unit} ×{" "}
                    {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="shrink-0 text-base font-medium text-white">
                  {formatCurrency(materialLineTotal(item))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-base">
        <div className="flex justify-between text-slate-400">
          <span>Subtotal</span>
          <span>{formatCurrency(isPlaceholder && !hasRealData ? 0 : subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Tax ({taxRate}%)</span>
          <span>{formatCurrency(isPlaceholder && !hasRealData ? 0 : tax)}</span>
        </div>
        <div className="flex justify-between pt-1 font-semibold text-white">
          <span>Grand Total</span>
          <span className="text-accent">
            {formatCurrency(isPlaceholder && !hasRealData ? 0 : grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PreviewField({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-base ${
          placeholder ? "text-slate-600 italic" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
