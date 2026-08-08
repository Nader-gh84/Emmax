import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Idempotently attach a time entry to the open pending labour invoice for its
 * employee pay period (RPC from migration 037). Returns invoice id or null.
 *
 * No-ops (returns null) for salary employees, missing/zero rate, or zero hours.
 */
export async function ensureLabourInvoiceForTimeEntry(
  supabase: SupabaseClient,
  timeEntryId: string
): Promise<string | null> {
  if (!timeEntryId) return null;

  const { data, error } = await supabase.rpc(
    "ensure_labour_invoice_for_time_entry",
    { p_time_entry_id: timeEntryId }
  );

  if (error) {
    console.error(
      "[ensureLabourInvoiceForTimeEntry]",
      error.message,
      error.message?.includes("ensure_labour_invoice_for_time_entry")
        ? " — run migration 037_labour_accounting.sql"
        : ""
    );
    return null;
  }

  return typeof data === "string" && data ? data : null;
}
