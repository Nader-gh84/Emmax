import type { SupabaseClient } from "@supabase/supabase-js";
import {
  planLabourFifoAllocations,
  sumAllocationsForLabourInvoice,
  type EnrichedLabourInvoice,
  type LabourPaymentAllocationRow,
} from "@/lib/labour-accounting";

function asMoney(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Confirm a pending_confirmation labour invoice so it counts toward outstanding.
 */
export async function confirmLabourInvoice(
  supabase: SupabaseClient,
  input: { invoiceId: string; employeeId: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const confirmedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("labour_invoices")
    .update({
      status: "confirmed",
      confirmed_at: confirmedAt,
      updated_at: confirmedAt,
    })
    .eq("id", input.invoiceId)
    .eq("employee_id", input.employeeId)
    .eq("status", "pending_confirmation")
    .select("id")
    .maybeSingle();

  if (error) {
    const hint =
      error.message?.includes("labour_invoices") ||
      error.message?.includes("schema cache")
        ? " Run migration 037_labour_accounting.sql in Supabase."
        : "";
    return { ok: false, error: `Failed to confirm invoice.${hint}` };
  }
  if (!data) {
    return {
      ok: false,
      error: "Invoice not found or already confirmed.",
    };
  }

  return { ok: true };
}

/**
 * Sync time_entries.payment_status for entries linked to the given labour
 * invoices. Fully allocated confirmed invoices → paid; otherwise unpaid.
 */
export async function syncTimeEntryPaymentStatus(
  supabase: SupabaseClient,
  input: {
    invoices: Pick<EnrichedLabourInvoice, "id" | "amount" | "dbStatus">[];
    allocations: Pick<
      LabourPaymentAllocationRow,
      "labour_invoice_id" | "amount_applied"
    >[];
    invoiceIds?: string[];
  }
): Promise<void> {
  const targets = Array.from(
    new Set(
      input.invoiceIds?.filter(Boolean) ??
        input.invoices
          .filter((inv) => inv.dbStatus === "confirmed")
          .map((inv) => inv.id)
    )
  );

  for (const invoiceId of targets) {
    const invoice = input.invoices.find(
      (inv) => inv.id === invoiceId && inv.dbStatus === "confirmed"
    );
    if (!invoice) continue;

    const paid = sumAllocationsForLabourInvoice(invoice.id, input.allocations);
    // time_entries.payment_status is constrained to paid|unpaid
    // (partial invoice balances remain unpaid until fully allocated).
    const nextStatus =
      paid + 0.009 >= asMoney(invoice.amount) ? "paid" : "unpaid";

    const { data: links, error: linkError } = await supabase
      .from("labour_invoice_time_entries")
      .select("time_entry_id")
      .eq("labour_invoice_id", invoiceId);

    if (linkError) {
      console.error(
        "[syncTimeEntryPaymentStatus] links",
        invoiceId,
        linkError.message
      );
      continue;
    }

    const timeEntryIds = (
      (links as { time_entry_id: string }[] | null) ?? []
    ).map((row) => row.time_entry_id);

    if (timeEntryIds.length === 0) continue;

    const { error } = await supabase
      .from("time_entries")
      .update({
        payment_status: nextStatus,
      })
      .in("id", timeEntryIds);

    if (error) {
      console.error(
        "[syncTimeEntryPaymentStatus]",
        invoiceId,
        error.message
      );
    }
  }
}

export type RecordLabourPaymentInput = {
  employeeId: string;
  userId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  notes?: string | null;
  /**
   * When empty/undefined → FIFO across all confirmed open invoices.
   * When provided → FIFO only among those invoice ids (manual selection).
   */
  selectedInvoiceIds?: string[];
  invoices: EnrichedLabourInvoice[];
};

/**
 * Insert account-level labour payment + allocations, then sync linked
 * time_entries.payment_status.
 */
export async function recordLabourPayment(
  supabase: SupabaseClient,
  input: RecordLabourPaymentInput
): Promise<
  | { ok: true; paymentId: string }
  | { ok: false; error: string }
> {
  const amount = asMoney(input.amount);
  if (amount <= 0) {
    return { ok: false, error: "Enter a payment amount greater than zero." };
  }
  if (!input.paymentDate) {
    return { ok: false, error: "Payment date is required." };
  }
  if (!input.paymentMethod.trim()) {
    return { ok: false, error: "Payment method is required." };
  }

  // Empty/undefined selectedInvoiceIds → FIFO across all confirmed open invoices.
  const manual = (input.selectedInvoiceIds?.length ?? 0) > 0;

  const pool = manual
    ? input.invoices.filter((inv) =>
        input.selectedInvoiceIds!.includes(inv.id)
      )
    : input.invoices;

  if (manual) {
    if (pool.length === 0) {
      return {
        ok: false,
        error: "Select at least one confirmed invoice to apply this payment.",
      };
    }
    const invalidPending = pool.some((inv) => inv.dbStatus !== "confirmed");
    if (invalidPending) {
      return {
        ok: false,
        error: "Only confirmed invoices can receive payment allocations.",
      };
    }
    const closed = pool.every((inv) => inv.balance <= 0.009);
    if (closed) {
      return {
        ok: false,
        error: "Selected invoices have no remaining balance.",
      };
    }
  }

  const plan = planLabourFifoAllocations({
    paymentAmount: amount,
    invoices: pool,
  });

  const { data: paymentRow, error: paymentError } = await supabase
    .from("labour_payments")
    .insert({
      user_id: input.userId,
      employee_id: input.employeeId,
      payment_date: input.paymentDate,
      amount,
      payment_method: input.paymentMethod.trim(),
      reference_number: input.referenceNumber?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (paymentError || !paymentRow) {
    const hint =
      paymentError?.message?.includes("labour_payments") ||
      paymentError?.message?.includes("schema cache")
        ? " Run migration 037_labour_accounting.sql in Supabase."
        : "";
    return {
      ok: false,
      error: `Failed to record payment.${hint}`,
    };
  }

  const paymentId = String((paymentRow as { id: string }).id);

  if (plan.length > 0) {
    const { error: allocError } = await supabase
      .from("labour_payment_allocations")
      .insert(
        plan.map((row) => ({
          user_id: input.userId,
          payment_id: paymentId,
          labour_invoice_id: row.invoiceId,
          amount_applied: row.amountApplied,
        }))
      );

    if (allocError) {
      await supabase.from("labour_payments").delete().eq("id", paymentId);
      return {
        ok: false,
        error: `Failed to allocate payment: ${allocError.message}`,
      };
    }
  }

  const affectedInvoiceIds = plan.map((row) => row.invoiceId);

  if (affectedInvoiceIds.length > 0) {
    const { data: allocationData } = await supabase
      .from("labour_payment_allocations")
      .select("labour_invoice_id, amount_applied")
      .in("labour_invoice_id", affectedInvoiceIds);

    await syncTimeEntryPaymentStatus(supabase, {
      invoices: input.invoices,
      allocations:
        (allocationData as LabourPaymentAllocationRow[] | null) ?? [],
      invoiceIds: affectedInvoiceIds,
    });
  }

  return { ok: true, paymentId };
}
