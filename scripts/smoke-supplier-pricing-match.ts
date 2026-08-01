/**
 * Smoke: supplier pricing matcher prefers confident matches and leaves weak ones unmatched.
 * Run: npx tsx scripts/smoke-supplier-pricing-match.ts
 */
import { matchExtractedPricesToMaterials } from "../src/lib/supplier-pricing";
import { createMaterialItem } from "../src/types/quote";

const materials = [
  createMaterialItem({
    item: "14/2 NMD Wire",
    brand: "Nexans",
    quantity: 250,
    unit: "ft",
    unitPrice: 0,
  }),
  createMaterialItem({
    item: "USB Outlet",
    brand: "Leviton",
    quantity: 8,
    unit: "each",
    unitPrice: 0,
  }),
  createMaterialItem({
    item: "Junction Box",
    brand: "Generic",
    quantity: 10,
    unit: "each",
    unitPrice: 0,
  }),
];

const extracted = [
  {
    description: "NMD 14/2 wire Nexans",
    brand: "Nexans",
    unitPrice: 0.92,
  },
  {
    description: "Leviton USB receptacle",
    brand: "Leviton",
    unitPrice: 39.5,
  },
  {
    description: "Mystery part XYZ-99",
    brand: "Acme",
    unitPrice: 12,
  },
];

const { rows, unmatchedExtracted } = matchExtractedPricesToMaterials(
  materials,
  extracted
);

const wire = rows.find((row) => row.materialItem.includes("14/2"));
const outlet = rows.find((row) => row.materialItem.includes("USB"));
const box = rows.find((row) => row.materialItem.includes("Junction"));

if (!wire || wire.confidence === "unmatched" || wire.suggestedUnitPrice !== 0.92) {
  throw new Error("Wire should confidently match extracted Nexans price");
}
if (!outlet || outlet.confidence === "unmatched" || outlet.suggestedUnitPrice !== 39.5) {
  throw new Error("USB outlet should confidently match Leviton price");
}
if (!box || box.selected) {
  throw new Error("Junction box should not auto-select without a match");
}
if (!unmatchedExtracted.some((item) => item.description.includes("XYZ-99"))) {
  throw new Error("Unmatched extracted item should appear in unmatched list");
}

console.log("smoke-supplier-pricing-match: OK", {
  matched: rows.filter((row) => row.selected).length,
  unmatchedExtracted: unmatchedExtracted.length,
});
