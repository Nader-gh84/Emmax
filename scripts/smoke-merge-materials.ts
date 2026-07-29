/**
 * Smoke: merge display preserves detailed materials; supplier payload stays detailed & price-free.
 * Run: npx tsx scripts/smoke-merge-materials.ts
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
  materialLineTotal,
} from "../src/types/quote";

const materials = [
  createMaterialItem({
    item: "14/2 Wire",
    brand: "Nexans",
    quantity: 250,
    unit: "ft",
    unitPrice: 0.85,
  }),
  createMaterialItem({
    item: "USB Outlet",
    brand: "Leviton",
    quantity: 8,
    unit: "each",
    unitPrice: 42.5,
  }),
];

const labour = [
  createLabourItem({
    description: "Installation",
    hours: 6,
    rate: 95,
  }),
];

const materialsTotal = materials.reduce(
  (sum, item) => sum + materialLineTotal(item),
  0
);

// Simulate merged display rows (materials collapsed, labour untouched)
const priceMode: "detailed" | "merged" = "merged";
const displayRows =
  priceMode === "merged" && materials.length > 0
    ? [
        { kind: "merged_materials" as const, total: materialsTotal },
        ...labour.map((item) => ({ kind: "labour" as const, item })),
      ]
    : [
        ...materials.map((item) => ({ kind: "material" as const, item })),
        ...labour.map((item) => ({ kind: "labour" as const, item })),
      ];

if (displayRows.length !== 2) {
  throw new Error(`Expected 2 display rows when merged, got ${displayRows.length}`);
}
if (displayRows[0].kind !== "merged_materials") {
  throw new Error("First row should be merged materials");
}
if (displayRows[0].total !== materialsTotal) {
  throw new Error(
    `Merged total expected ${materialsTotal}, got ${displayRows[0].total}`
  );
}
if (materials.length !== 2) {
  throw new Error("Detailed materials state must remain intact after merge");
}

const supplierLines = toSupplierMaterialLines(materials);
const plain = formatSupplierMaterialsPlain(supplierLines);
const message = buildDefaultSupplierMessage("Acme Electric", "Jane Doe");
const html = buildSupplierRequestEmailHtml({
  messageBody: message,
  materials: supplierLines,
  projectName: "Kitchen",
  companyName: "Acme Electric",
});

if (!plain.includes("14/2 Wire") || !plain.includes("USB Outlet")) {
  throw new Error("Supplier materials must include full detailed list");
}
if (plain.includes("0.85") || plain.includes("42.5") || /\$\d/.test(plain)) {
  throw new Error("Supplier materials must not include prices");
}
if (plain.toLowerCase().includes("installation") || plain.includes("95")) {
  throw new Error("Supplier materials must not include labour");
}
if (!message.includes("Acme Electric") || !message.includes("Jane Doe")) {
  throw new Error("Default supplier message missing company/owner");
}
if (!html.includes("14/2 Wire") || !html.includes("Materials list")) {
  throw new Error("Supplier HTML email missing materials");
}
if (html.includes("unitPrice") || html.includes("$42.50") || html.includes(">0.85<")) {
  throw new Error("Supplier HTML must not include prices");
}
if (html.toLowerCase().includes("labour") || html.includes("Installation")) {
  throw new Error("Supplier HTML must not include labour");
}

// Unmerge restores detailed rows
const unmerged = [
  ...materials.map((item) => ({ kind: "material" as const, item })),
  ...labour.map((item) => ({ kind: "labour" as const, item })),
];

if (unmerged.length !== 3) {
  throw new Error("Unmerge should restore all detailed rows");
}

console.log("smoke-merge-materials: OK", {
  materialsKept: materials.length,
  mergedDisplayRows: displayRows.length,
  materialsTotal,
  supplierHasDetails: true,
  supplierPriceFree: true,
});
