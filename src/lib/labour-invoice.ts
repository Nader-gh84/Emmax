import type { SupabaseClient } from "@supabase/supabase-js";

export type LabourInvoiceBackfillResult = {
  ok: boolean;
  attached: number;
  skippedAlreadyLinked: number;
  skippedIneligible: number;
  considered: number;
  reason?: string;
  error?: string;
};

function asUuidString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (value != null && typeof value === "object" && "toString" in value) {
    const s = String(value);
    return s && s !== "[object Object]" ? s : null;
  }
  return null;
}

/**
 * Idempotently attach a time entry to the open pending labour invoice for its
 * employee pay period (RPC from migration 037/038). Returns invoice id or null.
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
        ? " — run migration 037_labour_accounting.sql / 038_labour_invoice_backfill.sql"
        : ""
    );
    return null;
  }

  return asUuidString(data);
}

/**
 * Backfill all unlinked hourly time entries for one employee into pay-period
 * labour invoices (RPC from migration 038). Safe to call on every detail load.
 */
export async function backfillLabourInvoicesForEmployee(
  supabase: SupabaseClient,
  employeeId: string
): Promise<LabourInvoiceBackfillResult> {
  if (!employeeId) {
    return {
      ok: false,
      attached: 0,
      skippedAlreadyLinked: 0,
      skippedIneligible: 0,
      considered: 0,
      error: "employee_id_required",
    };
  }

  const { data, error } = await supabase.rpc(
    "backfill_labour_invoices_for_employee",
    { p_employee_id: employeeId }
  );

  if (error) {
    console.error(
      "[backfillLabourInvoicesForEmployee]",
      error.message,
      error.message?.includes("backfill_labour_invoices_for_employee")
        ? " — run migration 038_labour_invoice_backfill.sql"
        : ""
    );
    return {
      ok: false,
      attached: 0,
      skippedAlreadyLinked: 0,
      skippedIneligible: 0,
      considered: 0,
      error: error.message,
    };
  }

  const row = (data ?? {}) as Record<string, unknown>;
  return {
    ok: row.ok !== false,
    attached: Number(row.attached) || 0,
    skippedAlreadyLinked: Number(row.skipped_already_linked) || 0,
    skippedIneligible: Number(row.skipped_ineligible) || 0,
    considered: Number(row.considered) || 0,
    reason: typeof row.reason === "string" ? row.reason : undefined,
    error: typeof row.error === "string" ? row.error : undefined,
  };
}
