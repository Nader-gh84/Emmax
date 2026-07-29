/**
 * Smoke: Send-to-Supplier payload is materials-only, price-free, with correct message template.
 * Run: npx tsx scripts/smoke-send-supplier.ts
 */
import {
  buildDefaultSupplierMessage,
  buildSupplierRequestEmailHtml,
  formatSupplierMaterialsPlain,
  toSupplierMaterialLines,
} from "../src/lib/email/supplier-email";
import {
  createLabourItem,
  createMaterialItem,
} from "../src/types/quote";

const materials = [
  createMaterialItem({
    item: "PEX Tubing",
    brand: "Uponor",
    quantity: 100,
    unit: "ft",
    unitPrice: 1.25,
  }),
  createMaterialItem({
    item: "Ball Valve",
    brand: "Generic",
    quantity: 4,
    unit: "each",
    unitPrice: 18,
  }),
];

const labour = [
  createLabourItem({
    description: "Rough-in labour",
    hours: 4,
    rate: 110,
  }),
];

const message = buildDefaultSupplierMessage(
  "North Peak Plumbing",
  "Alex Rivera"
);

const expectedSnippets = [
  "Hello,",
  "I am North Peak Plumbing's agent",
  "Please provide pricing for the following materials",
  "Mr./Ms. Alex Rivera (Owner)",
  "reply directly to this email",
  "Thank you.",
];

for (const snippet of expectedSnippets) {
  if (!message.includes(snippet)) {
    throw new Error(`Missing message snippet: ${snippet}`);
  }
}

const lines = toSupplierMaterialLines(materials);
const serialized = JSON.stringify(lines);

if (serialized.includes("unitPrice") || serialized.includes("1.25")) {
  throw new Error("toSupplierMaterialLines must omit prices");
}

// Labour is never passed into supplier helpers — only materials.
const plain = formatSupplierMaterialsPlain(lines);
const html = buildSupplierRequestEmailHtml({
  messageBody: message,
  materials: lines,
  projectName: "Bath Reno",
  companyName: "North Peak Plumbing",
});

const combined = `${message}\n${plain}\n${html}`;

if (combined.includes("Rough-in labour") || combined.includes("110")) {
  throw new Error("Supplier content leaked labour");
}
if (combined.includes("1.25") || combined.includes("unitPrice")) {
  throw new Error("Supplier content leaked unit prices");
}
if (/\$\d/.test(combined)) {
  throw new Error("Supplier content includes currency amounts");
}

// Ensure labour array was never mixed in (sanity for future callers)
if (labour.length !== 1) {
  throw new Error("Unexpected labour fixture");
}

if (!html.includes("PEX Tubing") || !html.includes("Uponor") || !html.includes("100")) {
  throw new Error("Supplier HTML missing material details");
}
if (!html.includes("Ball Valve") || !html.includes(">4<") || !html.includes("each")) {
  throw new Error("Supplier HTML missing second material");
}
if (!plain.includes("PEX Tubing") || !plain.includes("Ball Valve")) {
  throw new Error("Plain materials list incomplete");
}

console.log("smoke-send-supplier: OK", {
  itemCount: lines.length,
  messagePreview: message.split("\n")[2],
});
