/**
 * Smoke test PDF generation with labour + merged materials (no network).
 * Run: npx tsx scripts/smoke-voice-quote-pdf.ts
 */
import { generateQuotePdfBuffer } from "../src/lib/pdf/generate-quote-pdf";

async function main() {
  const buffer = await generateQuotePdfBuffer({
    customerName: "Quote Draft",
    customerEmail: "draft@emax.local",
    projectName: "Kitchen Reno",
    notes: "Evening delivery preferred.",
    validityDays: 30,
    validUntil: "2026-08-28",
    taxRate: 12,
    gstRate: 5,
    pstRate: 7,
    discountMode: "amount",
    discountAmount: 50,
    discountPercent: 0,
    priceDisplayMode: "merged",
    quoteNumber: "Q-2026-0001",
    materials: [
      {
        item: "14/2 NMD90 Wire",
        brand: "Nexans",
        quantity: 250,
        unit: "ft",
        unitPrice: 0.85,
      },
      {
        item: "20A Dual USB Outlet",
        brand: "Leviton",
        quantity: 8,
        unit: "each",
        unitPrice: 42.5,
      },
    ],
    labourItems: [
      {
        description: "Labour – Installation",
        hours: 6,
        rate: 95,
      },
    ],
  });

  if (!Buffer.isBuffer(buffer) || buffer.length < 500) {
    throw new Error(`Unexpected PDF buffer size: ${buffer.length}`);
  }

  // PDF magic header
  const header = buffer.subarray(0, 4).toString("utf8");
  if (header !== "%PDF") {
    throw new Error(`Expected PDF header, got ${header}`);
  }

  console.log(`smoke-voice-quote-pdf: OK (${buffer.length} bytes, merged mode)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
