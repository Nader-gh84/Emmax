import {
  MaterialItem,
  formatCurrency,
  materialLineTotal,
} from "@/types/quote";

export interface QuotePreviewBodyProps {
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
}

function formatItemWithBrand(item: string, brand: string): string {
  const trimmedBrand = brand.trim();
  return trimmedBrand ? `${item} — ${trimmedBrand}` : item;
}

export function QuotePreviewBody({
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
}: QuotePreviewBodyProps) {
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
              <p className="break-words text-base text-white">
                {formatItemWithBrand(item.item, item.brand)}
              </p>
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
                <td className="break-words py-2 text-white">
                  {formatItemWithBrand(item.item, item.brand)}
                </td>
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
