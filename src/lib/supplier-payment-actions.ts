import type { SupabaseClient } from "@supabase/supabase-js";
import {
  planFifoAllocations,
  sumAllocationsForInvoice,
  type EnrichedSupplierInvoice,
  type SupplierPaymentAllocationRow,
} from "@/lib/supplier-accounting";

function asMoney(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Confirm a pending_confirmation supplier invoice so it counts toward outstanding.
 */
export async function confirmSupplierInvoice(
  supabase: SupabaseClient,
  input: { invoiceId: string; supplierId: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const confirmedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("supplier_invoices")
    .update({
      status: "confirmed",
      confirmed_at: confirmedAt,
      updated_at: confirmedAt,
    })
    .eq("id", input.invoiceId)
    .eq("supplier_id", input.supplierId)
    .eq("status", "pending_confirmation")
    .select("id")
    .maybeSingle();

  if (error) {
    const hint =
      error.message?.includes("supplier_invoices") ||
      error.message?.includes("schema cache")
        ? " Run migration 036_supplier_accounting.sql in Supabase."
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
 * Sync material_orders.payment_status from invoice allocations for the given
 * material order ids (paid when allocated >= invoice amount).
 */
export async function syncMaterialOrderPaymentStatus(
  supabase: SupabaseClient,
  input: {
    invoices: Pick<
      EnrichedSupplierInvoice,
      "id" | "amount" | "materialOrderId" | "dbStatus"
    >[];
    allocations: Pick<
      SupplierPaymentAllocationRow,
      "invoice_id" | "amount_applied"
    >[];
    materialOrderIds?: string[];
  }
): Promise<void> {
  const targets = Array.from(
    new Set(
      input.materialOrderIds?.filter(Boolean) ??
        input.invoices
          .map((inv) => inv.materialOrderId)
          .filter((id): id is string => Boolean(id))
    )
  );

  for (const orderId of targets) {
    const invoice = input.invoices.find(
      (inv) =>
        inv.materialOrderId === orderId && inv.dbStatus === "confirmed"
    );
    if (!invoice) {
      // No confirmed invoice for this order — leave payment_status alone.
      continue;
    }

    const paid = sumAllocationsForInvoice(invoice.id, input.allocations);
    // material_orders.payment_status is constrained to paid|unpaid
    // (partial invoice balances remain unpaid until fully allocated).
    const nextStatus =
      paid + 0.009 >= asMoney(invoice.amount) ? "paid" : "unpaid";

    const { error } = await supabase
      .from("material_orders")
      .update({
        payment_status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error(
        "[syncMaterialOrderPaymentStatus]",
        orderId,
        error.message
      );
    }
  }
}

export type RecordSupplierPaymentInput = {
  supplierId: string;
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
  invoices: EnrichedSupplierInvoice[];
};

/**
 * Insert account-level supplier payment + allocations, then sync linked
 * material_orders.payment_status.
 */
export async function recordSupplierPayment(
  supabase: SupabaseClient,
  input: RecordSupplierPaymentInput
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
  // Non-empty list → FIFO only among the selected (manual) invoices.
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

  const plan = planFifoAllocations({
    paymentAmount: amount,
    invoices: pool,
  });

  const { data: paymentRow, error: paymentError } = await supabase
    .from("supplier_payments")
    .insert({
      user_id: input.userId,
      supplier_id: input.supplierId,
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
      paymentError?.message?.includes("supplier_payments") ||
      paymentError?.message?.includes("schema cache")
        ? " Run migration 036_supplier_accounting.sql in Supabase."
        : "";
    return {
      ok: false,
      error: `Failed to record payment.${hint}`,
    };
  }

  const paymentId = String(
    (paymentRow as { id: string }).id
  );

  if (plan.length > 0) {
    const { error: allocError } = await supabase
      .from("supplier_payment_allocations")
      .insert(
        plan.map((row) => ({
          user_id: input.userId,
          payment_id: paymentId,
          invoice_id: row.invoiceId,
          amount_applied: row.amountApplied,
        }))
      );

    if (allocError) {
      // Best-effort rollback of the payment row.
      await supabase.from("supplier_payments").delete().eq("id", paymentId);
      return {
        ok: false,
        error: `Failed to allocate payment: ${allocError.message}`,
      };
    }
  }

  // Reload allocations for affected invoices to sync order payment_status.
  const affectedInvoiceIds = plan.map((row) => row.invoiceId);
  const materialOrderIds = input.invoices
    .filter((inv) => affectedInvoiceIds.includes(inv.id) && inv.materialOrderId)
    .map((inv) => inv.materialOrderId!) ;

  if (materialOrderIds.length > 0) {
    const { data: allocationData } = await supabase
      .from("supplier_payment_allocations")
      .select("invoice_id, amount_applied")
      .in("invoice_id", affectedInvoiceIds);

    await syncMaterialOrderPaymentStatus(supabase, {
      invoices: input.invoices,
      allocations: (allocationData as SupplierPaymentAllocationRow[] | null) ?? [],
      materialOrderIds,
    });
  }

  return { ok: true, paymentId };
}
