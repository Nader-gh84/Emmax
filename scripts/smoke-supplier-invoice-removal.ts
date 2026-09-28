/**
 * Supplier invoice removal plan: block allocated, void order-linked, else delete.
 * Run: npx tsx scripts/smoke-supplier-invoice-removal.ts
 */
import { planSupplierInvoiceRemoval } from "../src/lib/supplier-accounting";

const allocated = planSupplierInvoiceRemoval({
  allocatedAmount: 25,
  materialOrderId: "order-1",
});
if (allocated !== "block_allocated") {
  throw new Error(`Expected block_allocated, got ${allocated}`);
}

const orderLinked = planSupplierInvoiceRemoval({
  allocatedAmount: 0,
  materialOrderId: "order-1",
});
if (orderLinked !== "void") {
  throw new Error(`Expected void, got ${orderLinked}`);
}

const manual = planSupplierInvoiceRemoval({
  allocatedAmount: 0,
  materialOrderId: null,
});
if (manual !== "delete") {
  throw new Error(`Expected delete, got ${manual}`);
}

console.log("smoke-supplier-invoice-removal: OK");
