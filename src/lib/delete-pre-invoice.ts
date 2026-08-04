import { createClient } from "@/lib/supabase";

/**
 * Delete a pre-invoice/quote and related rows in a safe order.
 * FKs use ON DELETE SET NULL for quote/project links, so we clean up
 * explicitly: notifications → material_orders → project → storage PDF → quote.
 */
export async function deletePreInvoiceByQuoteId(quoteId: string): Promise<void> {
  const id = quoteId.trim();
  if (!id) throw new Error("Quote id is required.");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");

  const { data: quote, error: quoteLoadError } = await supabase
    .from("quotes")
    .select("id, pdf_url, supplier_pricing_file_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (quoteLoadError) {
    throw new Error(quoteLoadError.message || "Failed to load quote.");
  }
  if (!quote) {
    throw new Error("Quote not found.");
  }

  const { data: project, error: projectLoadError } = await supabase
    .from("projects")
    .select("id")
    .eq("quote_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectLoadError) {
    throw new Error(projectLoadError.message || "Failed to load linked project.");
  }

  const { error: notificationsError } = await supabase
    .from("notifications")
    .delete()
    .eq("quote_id", id)
    .eq("user_id", user.id);

  if (notificationsError) {
    throw new Error(
      notificationsError.message || "Failed to delete related notifications."
    );
  }

  if (project?.id) {
    const { error: ordersError } = await supabase
      .from("material_orders")
      .delete()
      .eq("project_id", project.id)
      .eq("user_id", user.id);

    if (ordersError) {
      const hint =
        ordersError.message?.toLowerCase().includes("policy") ||
        ordersError.message?.toLowerCase().includes("permission") ||
        ordersError.code === "42501"
          ? " Run migration 028_material_orders_delete_policy.sql in Supabase."
          : "";
      throw new Error(
        `${ordersError.message || "Failed to delete material orders."}${hint}`
      );
    }

    const { error: projectDeleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id)
      .eq("user_id", user.id);

    if (projectDeleteError) {
      throw new Error(
        projectDeleteError.message || "Failed to delete linked project."
      );
    }
  }

  const storagePaths: string[] = [];
  if (typeof quote.pdf_url === "string" && quote.pdf_url.trim()) {
    storagePaths.push(quote.pdf_url.trim());
  }
  if (
    typeof quote.supplier_pricing_file_path === "string" &&
    quote.supplier_pricing_file_path.trim()
  ) {
    // Best-effort: path may live in supplier-pricing bucket.
  }

  if (storagePaths.length > 0) {
    const { error: pdfRemoveError } = await supabase.storage
      .from("quote-pdfs")
      .remove(storagePaths);
    if (pdfRemoveError) {
      console.warn(
        "[deletePreInvoiceByQuoteId] Failed to remove quote PDF:",
        pdfRemoveError.message
      );
    }
  }

  if (
    typeof quote.supplier_pricing_file_path === "string" &&
    quote.supplier_pricing_file_path.trim()
  ) {
    const { error: pricingRemoveError } = await supabase.storage
      .from("supplier-pricing")
      .remove([quote.supplier_pricing_file_path.trim()]);
    if (pricingRemoveError) {
      console.warn(
        "[deletePreInvoiceByQuoteId] Failed to remove supplier pricing file:",
        pricingRemoveError.message
      );
    }
  }

  const { error: quoteDeleteError } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (quoteDeleteError) {
    throw new Error(quoteDeleteError.message || "Failed to delete quote.");
  }
}
