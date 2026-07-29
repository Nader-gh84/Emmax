/**
 * Local smoke test for extraction mapping + totals (no OpenAI required).
 * Run: npx tsx scripts/smoke-voice-quote.ts
 */
import { mapExtractionToLineItems } from "../src/lib/quote-extraction";
import { calculateVoiceQuoteTotals } from "../src/types/quote";

const mapped = mapExtractionToLineItems(
  [
    {
      item: "14/2 NMD90 Wire",
      brand: "Nexans",
      quantity: 250,
      unit: "ft",
      unitPrice: 0.85,
    },
    {
      item: "Installation labour",
      brand: "Generic",
      quantity: 6,
      unit: "hour",
      unitPrice: 95,
    },
  ],
  [
    {
      description: "Labour – Rough-in",
      hours: 3,
      rate: 85,
    },
  ],
  "Kitchen electrical rough-in and finish."
);

const totals = calculateVoiceQuoteTotals({
  materials: mapped.materials,
  labourItems: mapped.labourItems,
  gstRate: 5,
  pstRate: 7,
  discountMode: "amount",
  discountAmount: 50,
  discountPercent: 0,
});

console.log(
  JSON.stringify(
    {
      materials: mapped.materials.length,
      labourItems: mapped.labourItems.length,
      labourDescriptions: mapped.labourItems.map((item) => item.description),
      materialsTotal: totals.materialsTotal,
      labourTotal: totals.labourTotal,
      subtotal: totals.subtotal,
      discountApplied: totals.discountApplied,
      gst: totals.gst,
      pst: totals.pst,
      grandTotal: totals.grandTotal,
    },
    null,
    2
  )
);

const expectedMaterialsTotal = 250 * 0.85;
const expectedLabourTotal = 6 * 95 + 3 * 85;
const expectedSubtotal = expectedMaterialsTotal + expectedLabourTotal;
const expectedTaxable = expectedSubtotal - 50;
const expectedGst = expectedTaxable * 0.05;
const expectedPst = expectedTaxable * 0.07;
const expectedGrand = expectedTaxable + expectedGst + expectedPst;

function assertClose(label: string, actual: number, expected: number) {
  if (Math.abs(actual - expected) > 0.001) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

assertClose("materialsTotal", totals.materialsTotal, expectedMaterialsTotal);
assertClose("labourTotal", totals.labourTotal, expectedLabourTotal);
assertClose("subtotal", totals.subtotal, expectedSubtotal);
assertClose("gst", totals.gst, expectedGst);
assertClose("pst", totals.pst, expectedPst);
assertClose("grandTotal", totals.grandTotal, expectedGrand);

if (mapped.materials.length !== 1) {
  throw new Error(`Expected 1 material, got ${mapped.materials.length}`);
}
if (mapped.labourItems.length !== 2) {
  throw new Error(`Expected 2 labour items, got ${mapped.labourItems.length}`);
}

console.log("smoke-voice-quote: OK");
