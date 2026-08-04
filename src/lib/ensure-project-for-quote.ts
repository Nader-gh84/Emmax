import { createClient } from "@/lib/supabase";
import { materialsToStored, labourToStored } from "@/types/quote";
import type { LabourItem, MaterialItem } from "@/types/quote";

/**
 * Ensures a projects row exists for a quote so the Pre-Invoices dashboard
 * can list early-stage jobs (before customer accept).
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
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("[ensureProjectForQuote] insert failed:", insertError);
    return null;
  }

  return created.id as string;
}
