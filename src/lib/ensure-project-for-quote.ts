import { createClient } from "@/lib/supabase";
import { materialsToStored, labourToStored } from "@/types/quote";
import type { LabourItem, MaterialItem } from "@/types/quote";
import type { LabourBillingMode } from "@/types/labour-quoting";

/**
 * Ensures a projects row exists for a quote so the Pre-Invoices dashboard
 * can list early-stage jobs (before customer accept).
 *
 * Safe to call repeatedly: updates an existing row for the same quote_id,
 * or inserts one. Handles concurrent inserts via unique(quote_id) retry.
 */
export async function ensureProjectForQuote(input: {
  userId: string;
  quoteId: string;
  projectName: string;
  customerId: string | null;
  customerName?: string;
  materials: MaterialItem[];
  labourItems: LabourItem[];
  grandTotal: number;
  labourBillingMode?: LabourBillingMode | null;
}): Promise<string | null> {
  const supabase = createClient();
  const projectName =
    input.projectName.trim() ||
    input.customerName?.trim() ||
    "Untitled project";
  const now = new Date().toISOString();
  const startDate = now.slice(0, 10);
  const materials = materialsToStored(input.materials);
  const labourItems = labourToStored(input.labourItems);
  const value = Number(input.grandTotal) || 0;
  const labourBillingMode = input.labourBillingMode ?? null;

  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("quote_id", input.quoteId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("projects")
      .update({
        project_name: projectName,
        customer_id: input.customerId,
        materials,
        labour_items: labourItems,
        value,
        ...(labourBillingMode != null
          ? { labour_billing_mode: labourBillingMode }
          : {}),
        updated_at: now,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[ensureProjectForQuote] update failed:", error);
      return existing.id;
    }
    return existing.id as string;
  }

  const { data: created, error: insertError } = await supabase
    .from("projects")
    .insert({
      user_id: input.userId,
      quote_id: input.quoteId,
      customer_id: input.customerId,
      project_name: projectName,
      value,
      status: "active",
      start_date: startDate,
      start_date_confirmed: false,
      materials,
      labour_items: labourItems,
      labour_billing_mode: labourBillingMode,
      updated_at: now,
    })
    .select("id")
    .single();

  if (!insertError && created?.id) {
    return created.id as string;
  }

  // Concurrent create won the unique(quote_id) race — load and update that row.
  if (insertError?.code === "23505") {
    const { data: raced } = await supabase
      .from("projects")
      .select("id")
      .eq("quote_id", input.quoteId)
      .maybeSingle();

    if (raced?.id) {
      await supabase
        .from("projects")
        .update({
          project_name: projectName,
          customer_id: input.customerId,
          materials,
          labour_items: labourItems,
          value,
          ...(labourBillingMode != null
            ? { labour_billing_mode: labourBillingMode }
            : {}),
          updated_at: now,
        })
        .eq("id", raced.id);
      return raced.id as string;
    }
  }

  console.error("[ensureProjectForQuote] insert failed:", insertError);
  return null;
}
