"use client";

import {
  MaterialItem,
  calculateQuoteTotals,
  createMaterialItem,
  formatCurrency,
  materialLineTotal,
} from "@/types/quote";

interface StepMaterialsProps {
  materials: MaterialItem[];
  taxRate: number;
  onMaterialsChange: (materials: MaterialItem[]) => void;
  onTaxRateChange: (rate: number) => void;
  onReRecord: () => void;
  onContinue: () => void;
}

export function StepMaterials({
  materials,
  taxRate,
  onMaterialsChange,
  onTaxRateChange,
  onReRecord,
  onContinue,
}: StepMaterialsProps) {
  const { subtotal, tax, grandTotal } = calculateQuoteTotals(
    materials,
    taxRate
  );

  function updateMaterial(id: string, field: keyof MaterialItem, value: string) {
    onMaterialsChange(
      materials.map((item) => {
        if (item.id !== id) return item;

        if (field === "quantity" || field === "unitPrice") {
          return { ...item, [field]: parseFloat(value) || 0 };
        }

        return { ...item, [field]: value };
      })
    );
  }

  function addRow() {
    onMaterialsChange([...materials, createMaterialItem()]);
  }

  function deleteRow(id: string) {
    onMaterialsChange(materials.filter((item) => item.id !== id));
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white">Review materials</h2>
      <p className="mt-2 text-sm text-slate-400">
        Edit the AI-extracted line items before continuing.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 font-medium text-slate-300">Item</th>
              <th className="px-4 py-3 font-medium text-slate-300 w-24">Qty</th>
              <th className="px-4 py-3 font-medium text-slate-300 w-24">Unit</th>
              <th className="px-4 py-3 font-medium text-slate-300 w-32">
                Unit Price ($)
              </th>
              <th className="px-4 py-3 font-medium text-slate-300 w-28">Total</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {materials.map((item) => (
              <tr key={item.id} className="border-b border-white/5">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.item}
                    onChange={(e) =>
                      updateMaterial(item.id, "item", e.target.value)
                    }
                    className="w-full rounded border border-white/10 bg-navy px-2 py-1.5 text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateMaterial(item.id, "quantity", e.target.value)
                    }
                    className="w-full rounded border border-white/10 bg-navy px-2 py-1.5 text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) =>
                      updateMaterial(item.id, "unit", e.target.value)
                    }
                    className="w-full rounded border border-white/10 bg-navy px-2 py-1.5 text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateMaterial(item.id, "unitPrice", e.target.value)
                    }
                    className="w-full rounded border border-white/10 bg-navy px-2 py-1.5 text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2 font-medium text-white">
                  {formatCurrency(materialLineTotal(item))}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => deleteRow(item.id)}
                    className="text-red-400 transition hover:text-red-300"
                    aria-label="Delete row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-4 rounded-lg border border-dashed border-white/20 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-accent hover:text-white"
      >
        + Add row
      </button>

      <div className="mt-8 ml-auto max-w-xs space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Subtotal</span>
          <span className="font-medium text-white">
            {formatCurrency(subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Tax</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={taxRate}
              onChange={(e) =>
                onTaxRateChange(parseFloat(e.target.value) || 0)
              }
              className="w-16 rounded border border-white/10 bg-navy px-2 py-1 text-right text-white focus:border-accent focus:outline-none"
            />
            <span className="text-slate-400">%</span>
            <span className="font-medium text-white">
              {formatCurrency(tax)}
            </span>
          </div>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-3 text-base">
          <span className="font-semibold text-white">Grand Total</span>
          <span className="font-bold text-accent">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onReRecord}
          className="rounded-lg border border-white/20 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
        >
          Re-record
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
