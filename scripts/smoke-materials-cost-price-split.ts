/**
 * Smoke: marked-up sell must never inflate supplier invoice amount.
 *
 * Path under test (same math as order seed → computeMaterialOrderTotal →
 * ensure_supplier_invoice_for_order):
 *   1. Apply supplier cost + materials markup → unitCost + default unitPrice
 *   2. Contractor marks up sell further on the quote
 *   3. Seed material order from quote materials (unitCost only)
 *   4. Invoice amount = Σ(qty × unitCost) — NOT sell
 *
 * Run: npx tsx scripts/smoke-materials-cost-price-split.ts
 */
import {
  applySupplierCostsToMaterials,
  computeSupplierInvoiceAmountFromOrder,
  seedMaterialOrderLinesFromMaterials,
  sellPriceFromCost,
} from "../src/lib/materials-pricing";
import { createMaterialItem, materialLineTotal } from "../src/types/quote";
import { computeMaterialOrderTotal } from "../src/types/project-operations";

const MARKUP_PERCENT = 20;

const materials = [
  createMaterialItem({
    item: "14/2 NMD Wire",
    brand: "Nexans",
    quantity: 250,
    unit: "ft",
    unitCost: 0,
    unitPrice: 0,
  }),
  createMaterialItem({
    item: "USB Outlet",
    brand: "Leviton",
    quantity: 8,
    unit: "each",
    unitCost: 0,
    unitPrice: 0,
  }),
];

const supplierCosts = [
  { materialId: materials[0].id, unitCost: 0.92 },
  { materialId: materials[1].id, unitCost: 39.5 },
];

const afterApply = applySupplierCostsToMaterials(
  materials,
  supplierCosts,
  MARKUP_PERCENT
);

const wire = afterApply[0];
const outlet = afterApply[1];

if (wire.unitCost !== 0.92) {
  throw new Error(`Wire unitCost should be 0.92, got ${wire.unitCost}`);
}
if (outlet.unitCost !== 39.5) {
  throw new Error(`Outlet unitCost should be 39.5, got ${outlet.unitCost}`);
}

const expectedWireSell = sellPriceFromCost(0.92, MARKUP_PERCENT);
const expectedOutletSell = sellPriceFromCost(39.5, MARKUP_PERCENT);
if (wire.unitPrice !== expectedWireSell) {
  throw new Error(
    `Wire sell should be ${expectedWireSell} after ${MARKUP_PERCENT}% markup, got ${wire.unitPrice}`
  );
}
if (outlet.unitPrice !== expectedOutletSell) {
  throw new Error(
    `Outlet sell should be ${expectedOutletSell} after ${MARKUP_PERCENT}% markup, got ${outlet.unitPrice}`
  );
}

// Contractor marks up sell further (customer price) — must not touch unitCost.
const afterMarkup = afterApply.map((item) =>
  item.item.includes("USB")
    ? { ...item, unitPrice: 59.99 }
    : { ...item, unitPrice: 1.49 }
);

if (afterMarkup[0].unitCost !== 0.92 || afterMarkup[1].unitCost !== 39.5) {
  throw new Error("Marking up sell must not change unitCost");
}

const sellTotal = afterMarkup.reduce(
  (sum, item) => sum + materialLineTotal(item),
  0
);
const costTotal =
  250 * 0.92 + 8 * 39.5; /* 230 + 316 = 546 */

if (Math.abs(sellTotal - (250 * 1.49 + 8 * 59.99)) > 0.001) {
  throw new Error(`Unexpected sell total ${sellTotal}`);
}
if (sellTotal <= costTotal) {
  throw new Error(
    "Test setup invalid: sell total should exceed supplier cost after markup"
  );
}

const orderLines = seedMaterialOrderLinesFromMaterials(afterMarkup);

for (const line of orderLines) {
  if ("unitPrice" in line && (line as { unitPrice?: number }).unitPrice != null) {
    throw new Error("Order lines must not carry unitPrice (sell)");
  }
  if (line.unitCost == null) {
    throw new Error("Order lines must carry unitCost");
  }
}

const orderTotal = computeMaterialOrderTotal({ materials: orderLines });
const invoiceAmount = computeSupplierInvoiceAmountFromOrder({
  materials: orderLines,
});

if (Math.abs(orderTotal - costTotal) > 0.001) {
  throw new Error(
    `Order total ${orderTotal} must equal supplier cost ${costTotal}, not sell ${sellTotal}`
  );
}
if (Math.abs(invoiceAmount - costTotal) > 0.001) {
  throw new Error(
    `Invoice amount ${invoiceAmount} must equal supplier cost ${costTotal}, not sell ${sellTotal}`
  );
}
if (Math.abs(invoiceAmount - sellTotal) < 0.001) {
  throw new Error(
    "Invoice amount incorrectly matches marked-up sell — financial corruption"
  );
}

// Legacy conflated unitPrice on an order line must still sum as cost fallback
// only when unitCost is absent (pre-migration). After seed, unitCost is set.
const legacyOnly = computeMaterialOrderTotal({
  materials: [{ quantity: 10, unitPrice: 99 }],
});
if (legacyOnly !== 990) {
  throw new Error("Legacy unitPrice fallback for pre-migration rows failed");
}

const costWinsOverLegacySell = computeMaterialOrderTotal({
  materials: [{ quantity: 10, unitCost: 5, unitPrice: 99 }],
});
if (costWinsOverLegacySell !== 50) {
  throw new Error(
    `unitCost must win over legacy unitPrice; got ${costWinsOverLegacySell}`
  );
}

console.log("smoke-materials-cost-price-split: OK", {
  supplierCostTotal: costTotal,
  markedUpSellTotal: Math.round(sellTotal * 100) / 100,
  orderTotal,
  invoiceAmount,
  markupPercent: MARKUP_PERCENT,
});
