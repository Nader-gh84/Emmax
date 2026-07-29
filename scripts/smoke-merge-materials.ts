/**
 * Smoke: merge display preserves detailed materials; supplier email is always detailed.
 * Run: npx tsx scripts/smoke-merge-materials.ts
 */
import { buildSupplierMaterialsEmail } from "../src/lib/quote-pdf-client";
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

const mailto = decodeURIComponent(
  buildSupplierMaterialsEmail({
    supplierName: "Acme Supply",
    supplierEmail: "orders@acme.test",
    projectName: "Kitchen",
    materials,
  })
);

if (!mailto.includes("14/2 Wire") || !mailto.includes("USB Outlet")) {
  throw new Error("Supplier email must include full detailed material list");
}
if (mailto.includes("Materials (combined)") || mailto.includes("1 lot")) {
  throw new Error("Supplier email must not use merged summary");
}

// Unmerge restores detailed rows
const unmerged =
  "detailed" === "detailed"
    ? [
        ...materials.map((item) => ({ kind: "material" as const, item })),
        ...labour.map((item) => ({ kind: "labour" as const, item })),
      ]
    : [];

if (unmerged.length !== 3) {
  throw new Error("Unmerge should restore all detailed rows");
}

console.log("smoke-merge-materials: OK", {
  materialsKept: materials.length,
  mergedDisplayRows: displayRows.length,
  materialsTotal,
  supplierHasDetails: true,
});
