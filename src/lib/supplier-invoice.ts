import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Idempotently create a pending_confirmation supplier invoice for a confirmed
 * material order (RPC from migration 036). Returns invoice id or null.
 */
export async function ensureSupplierInvoiceForOrder(
  supabase: SupabaseClient,
  orderId: string
): Promise<string | null> {
  if (!orderId) return null;

  const { data, error } = await supabase.rpc(
    "ensure_supplier_invoice_for_order",
    { p_order_id: orderId }
  );

  if (error) {
    console.error(
      "[ensureSupplierInvoiceForOrder]",
      error.message,
      error.message?.includes("ensure_supplier_invoice_for_order")
        ? " — run migration 036_supplier_accounting.sql"
        : ""
    );
    return null;
  }

  return typeof data === "string" && data ? data : null;
}
