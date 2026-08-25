/**
 * Materials cost vs sell helpers.
 * Schema: migration 044_materials_cost_price_split.sql
 */

import type { MaterialItem } from "@/types/quote";
import type { MaterialOrderLine } from "@/types/material-order";
import { computeMaterialOrderTotal } from "@/types/project-operations";

/** Default: no markup — unitPrice starts equal to unitCost. */
export const DEFAULT_MATERIALS_MARKUP_PERCENT = 0;

/** Default labour markup for Final Invoice (column shipped in 044). */
export const DEFAULT_LABOUR_MARKUP_PERCENT = 0;

/** Confirmed supplier cost for one material line (Upload Prices). */
export type SupplierCostUpdate = {
  materialId: string;
  unitCost: number;
};

/** Clamp to 0–100; invalid → default. */
export function normalizeMaterialsMarkupPercent(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_MATERIALS_MARKUP_PERCENT;
  return Math.min(100, Math.max(0, n));
}

export function normalizeLabourMarkupPercent(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_LABOUR_MARKUP_PERCENT;
  return Math.min(100, Math.max(0, n));
}

function asMoney(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Default customer sell price from supplier cost + markup %.
 * markup 0 → sell === cost.
 */
export function sellPriceFromCost(
  unitCost: number,
  markupPercent: number
): number {
  const cost = asMoney(unitCost);
  const markup = normalizeMaterialsMarkupPercent(markupPercent);
  return asMoney(cost * (1 + markup / 100));
}

/** Margin % of sell: (price − cost) / price. */
export function materialsMarginPercent(
  unitCost: number,
  unitPrice: number
): number {
  const cost = asMoney(unitCost);
  const price = asMoney(unitPrice);
  if (price <= 0) return cost <= 0 ? 0 : -100;
  return ((price - cost) / price) * 100;
}

/**
 * Apply confirmed supplier costs: write unitCost, default unitPrice from markup.
 * Does not change lines that are not in updates (partial apply from Voice Builder).
 */
export function applySupplierCostsToMaterials(
  materials: MaterialItem[],
  updates: SupplierCostUpdate[],
  markupPercent: number
): MaterialItem[] {
  const costById = new Map(
    updates.map((update) => [update.materialId, asMoney(update.unitCost)])
  );
  const markup = normalizeMaterialsMarkupPercent(markupPercent);

  return materials.map((item) => {
    if (!costById.has(item.id)) return item;
    const unitCost = costById.get(item.id) as number;
    return {
      ...item,
      unitCost,
      unitPrice: sellPriceFromCost(unitCost, markup),
    };
  });
}

/**
 * Seed material-order lines from quote/project materials.
 * Orders carry supplier cost only — never customer sell price.
 */
export function seedMaterialOrderLinesFromMaterials(
  materials: Array<{
    id?: string;
    item: string;
    brand?: string | null;
    quantity: number;
    unit: string;
    unitCost: number;
    unitPrice?: number;
  }>
): MaterialOrderLine[] {
  return materials.map((row, index) => ({
    id: row.id || `line-${index}`,
    name: row.item,
    brand: row.brand ?? "",
    quantity: asMoney(row.quantity),
    unit: row.unit || "ea",
    unitCost: asMoney(row.unitCost),
    status: "In Quote",
  }));
}

/**
 * Same formula as ensure_supplier_invoice_for_order: Σ(qty × unitCost).
 * Used by smoke tests and UI totals so AP cannot read marked-up sell.
 */
export function computeSupplierInvoiceAmountFromOrder(order: {
  materials?: MaterialOrderLine[] | null;
}): number {
  return Math.round(computeMaterialOrderTotal(order) * 100) / 100;
}
