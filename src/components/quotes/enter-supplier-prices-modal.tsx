"use client";

import { useEffect, useMemo, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import { formatCurrency, type MaterialItem } from "@/types/quote";

/**
 * Manual supplier price entry for Pre-Invoice step 3.
 * File/AI upload remains available from Voice Quote Builder.
 */
export function EnterSupplierPricesModal({
  materials,
  isSaving,
  onClose,
  onSave,
}: {
  materials: MaterialItem[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (updates: { materialId: string; unitPrice: number }[]) => void | Promise<void>;
}) {
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const item of materials) {
      initial[item.id] =
        item.unitPrice > 0 ? String(item.unitPrice) : "";
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  const previewTotal = useMemo(() => {
    return materials.reduce((sum, item) => {
      const raw = prices[item.id]?.trim() ?? "";
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) return sum;
      return sum + item.quantity * price;
    }, 0);
  }, [materials, prices]);

  async function handleSave() {
    setError(null);
    const updates: { materialId: string; unitPrice: number }[] = [];
    for (const item of materials) {
      const raw = prices[item.id]?.trim() ?? "";
      if (!raw) {
        setError(`Enter a unit price for “${item.item || "material"}”.`);
        return;
      }
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) {
        setError(`Invalid price for “${item.item || "material"}”.`);
        return;
      }
      updates.push({ materialId: item.id, unitPrice: price });
    }
    if (updates.length === 0) {
      setError("No materials to price.");
      return;
    }
    await onSave(updates);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-navy shadow-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Enter Supplier Prices
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Type the unit price for each material from the supplier reply.
                File upload / AI extract is available in Voice Quote Builder.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {materials.length === 0 ? (
            <p className="text-sm text-slate-400">No materials on this quote.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-2 font-medium">Description</th>
                  <th className="pb-2 pr-2 font-medium">Qty</th>
                  <th className="pb-2 pr-2 font-medium">Unit price</th>
                  <th className="pb-2 font-medium">Line</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item) => {
                  const price = Number(prices[item.id] || 0);
                  const line =
                    Number.isFinite(price) && price >= 0
                      ? item.quantity * price
                      : 0;
                  return (
                    <tr key={item.id} className="border-b border-white/5">
                      <td className="py-3 pr-2">
                        <p className="font-medium text-white">
                          {item.item || "Material"}
                        </p>
                        {item.brand ? (
                          <p className="text-xs text-slate-500">{item.brand}</p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-2 text-slate-300">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={prices[item.id] ?? ""}
                          onChange={(event) =>
                            setPrices((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          className={`${touchInput} min-h-[36px] w-28 px-2 py-1 text-sm`}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-3 text-slate-200">
                        {formatCurrency(line)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Materials total:{" "}
            <span className="font-semibold text-white">
              {formatCurrency(previewTotal)}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`${touchBtnSecondary} px-4 text-sm`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || materials.length === 0}
              className={`${touchBtnPrimary} px-4 text-sm disabled:opacity-40`}
            >
              {isSaving ? "Saving…" : "Save prices"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
