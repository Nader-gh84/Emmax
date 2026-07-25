"use client";

import {
  MaterialItem,
  calculateQuoteTotals,
  createMaterialItem,
  formatCurrency,
  materialLineTotal,
} from "@/types/quote";
import { touchBtnPrimary, touchBtnSecondary, touchInput } from "@/components/quotes/ui";

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
    <div className="min-w-0">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">
        Review materials
      </h2>
      <p className="mt-2 text-base text-slate-400">
        Edit the AI-extracted line items before continuing.
      </p>

      {/* Mobile card layout */}
      <div className="mt-6 space-y-4 md:hidden">
        {materials.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <label className="flex-1 text-xs font-medium uppercase text-slate-500">
                Item
              </label>
              <button
                type="button"
                onClick={() => deleteRow(item.id)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-lg text-red-400"
                aria-label="Delete row"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={item.item}
              onChange={(e) => updateMaterial(item.id, "item", e.target.value)}
              className={`${touchInput} mt-1`}
            />

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">
                  Qty
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) =>
                    updateMaterial(item.id, "quantity", e.target.value)
                  }
                  className={`${touchInput} mt-1`}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">
                  Unit
                </label>
                <input
                  type="text"
                  value={item.unit}
                  onChange={(e) =>
                    updateMaterial(item.id, "unit", e.target.value)
                  }
                  className={`${touchInput} mt-1`}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">
                  Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateMaterial(item.id, "unitPrice", e.target.value)
                  }
                  className={`${touchInput} mt-1`}
                />
              </div>
            </div>

            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-base">
              <span className="text-slate-400">Line total</span>
              <span className="font-semibold text-white">
                {formatCurrency(materialLineTotal(item))}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 font-medium text-slate-300">Item</th>
              <th className="w-24 px-4 py-3 font-medium text-slate-300">Qty</th>
              <th className="w-24 px-4 py-3 font-medium text-slate-300">Unit</th>
              <th className="w-32 px-4 py-3 font-medium text-slate-300">
                Unit Price ($)
              </th>
              <th className="w-28 px-4 py-3 font-medium text-slate-300">Total</th>
              <th className="w-12 px-4 py-3" />
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
                    className="w-full min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1.5 text-base text-white focus:border-accent focus:outline-none"
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
                    className="w-full min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1.5 text-base text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) =>
                      updateMaterial(item.id, "unit", e.target.value)
                    }
                    className="w-full min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1.5 text-base text-white focus:border-accent focus:outline-none"
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
                    className="w-full min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1.5 text-base text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2 text-base font-medium text-white">
                  {formatCurrency(materialLineTotal(item))}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => deleteRow(item.id)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-red-400 hover:text-red-300"
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
        className={`${touchBtnSecondary} mt-4 w-full sm:w-auto`}
      >
        + Add row
      </button>

      <TotalsPanel
        subtotal={subtotal}
        tax={tax}
        grandTotal={grandTotal}
        taxRate={taxRate}
        onTaxRateChange={onTaxRateChange}
      />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button type="button" onClick={onReRecord} className={`${touchBtnSecondary} w-full sm:w-auto`}>
          Re-record
        </button>
        <button type="button" onClick={onContinue} className={`${touchBtnPrimary} w-full sm:w-auto`}>
          Continue
        </button>
      </div>
    </div>
  );
}

function TotalsPanel({
  subtotal,
  tax,
  grandTotal,
  taxRate,
  onTaxRateChange,
}: {
  subtotal: number;
  tax: number;
  grandTotal: number;
  taxRate: number;
  onTaxRateChange: (rate: number) => void;
}) {
  return (
    <div className="mt-8 w-full space-y-3 rounded-xl border border-white/10 bg-white/5 p-5 sm:ml-auto sm:max-w-xs">
      <div className="flex justify-between text-base">
        <span className="text-slate-400">Subtotal</span>
        <span className="font-medium text-white">{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between text-base">
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
            className="w-16 min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1 text-base text-right text-white focus:border-accent focus:outline-none"
          />
          <span className="text-slate-400">%</span>
          <span className="font-medium text-white">{formatCurrency(tax)}</span>
        </div>
      </div>
      <div className="flex justify-between border-t border-white/10 pt-3 text-lg">
        <span className="font-semibold text-white">Grand Total</span>
        <span className="font-bold text-accent">{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  );
}
