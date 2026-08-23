import type { QuoteActionState } from "@/lib/quote-actions";
import { fetchQuotePdfBlob } from "@/lib/quote-pdf-client";
import { quoteToWizardState } from "@/lib/quotes";
import { createClient } from "@/lib/supabase";
import { ensureProjectForQuote } from "@/lib/ensure-project-for-quote";
import {
  buildCustomerLabourItems,
  employeeCostRate,
  summarizeCreateQuoteLabour,
} from "@/lib/create-quote-labour";
import { loadCompanyBrandingForPdf } from "@/lib/pdf/load-company-branding";
import type { Employee } from "@/types/employee";
import type { LabourBillingMode } from "@/types/labour-quoting";
import {
  calculateVoiceQuoteTotals,
  materialsToStored,
  labourToStored,
  type MaterialItem,
  type Quote,
} from "@/types/quote";

export function quoteToActionState(quote: Quote): QuoteActionState {
  return quoteToWizardState(quote);
}

export type SaveCreateQuoteLabourInput = {
  quote: Quote;
  employees: Employee[];
  hoursByEmployeeId: Record<string, number>;
  billingMode: LabourBillingMode;
  sellHourlyRate: number;
  sellFlatAmount: number;
};

/**
 * Persist Create Quote labour: customer labour_items + billing mode,
 * replace quote_estimate time_entries (never touch actual), refresh project.
 */
export async function saveCreateQuoteLabour(
  input: SaveCreateQuoteLabourInput
): Promise<{ quote: Quote; projectId: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");

  const { quote, employees, billingMode } = input;
  if (!quote.supplier_pricing_uploaded_at) {
    throw new Error("Upload supplier prices before creating the quote.");
  }

  if (employees.length === 0) {
    throw new Error(
      "I can't work out labour cost yet — you haven't added any employees. Add them with their pay rates first."
    );
  }

  const summary = summarizeCreateQuoteLabour({
    employees,
    hoursByEmployeeId: input.hoursByEmployeeId,
    billingMode,
    sellHourlyRate: input.sellHourlyRate,
    sellFlatAmount: input.sellFlatAmount,
    warnBelowPercent: 0,
  });

  if (summary.lines.length === 0) {
    throw new Error("Assign hours to at least one employee before continuing.");
  }

  if (summary.missingRateNames.length > 0) {
    throw new Error(
      `Missing hourly pay rate for: ${summary.missingRateNames.join(", ")}. ` +
        "Add pay rates in Settings → Employees first."
    );
  }

  if (summary.charged <= 0) {
    throw new Error(
      billingMode === "flat"
        ? "Enter the flat labour amount you're charging the customer."
        : "Enter the customer labour rate ($/hour) you're charging."
    );
  }

  const labourItems = buildCustomerLabourItems({
    billingMode,
    totalHours: summary.totalHours,
    sellHourlyRate: input.sellHourlyRate,
    sellFlatAmount: input.sellFlatAmount,
  });

  const state = quoteToActionState(quote);
  const totals = calculateVoiceQuoteTotals({
    materials: state.materials,
    labourItems,
    gstRate: state.gstRate,
    pstRate: state.pstRate,
    discountMode: state.discountMode,
    discountAmount: state.discountAmount,
    discountPercent: state.discountPercent,
  });

  if (totals.grandTotal <= 0) {
    throw new Error(
      "Quote total is $0 after labour. Check material prices and labour charge."
    );
  }

  const now = new Date().toISOString();
  const { data: updatedQuote, error: quoteError } = await supabase
    .from("quotes")
    .update({
      labour_items: labourToStored(labourItems),
      labour_billing_mode: billingMode,
      subtotal: totals.subtotal,
      tax: totals.gst + totals.pst,
      grand_total: totals.grandTotal,
      updated_at: now,
    })
    .eq("id", quote.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (quoteError || !updatedQuote) {
    const hint =
      quoteError?.message?.includes("labour_billing_mode") ||
      quoteError?.code === "42703"
        ? " Run migration 043_labour_quote_estimates.sql in Supabase."
        : "";
    throw new Error(
      `Failed to save labour on quote.${hint || ` ${quoteError?.message || ""}`}`.trim()
    );
  }

  const projectId = await ensureProjectForQuote({
    userId: user.id,
    quoteId: quote.id,
    projectName: state.projectName,
    customerId: state.selectedCustomerId,
    customerName: state.customerName,
    materials: state.materials,
    labourItems,
    grandTotal: totals.grandTotal,
    labourBillingMode: billingMode,
  });

  if (!projectId) {
    throw new Error(
      "Labour saved on the quote, but no project row was found to store cost estimates."
    );
  }

  // Replace quote_estimate rows only — never delete actual job hours.
  const { error: deleteError } = await supabase
    .from("time_entries")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .eq("entry_source", "quote_estimate");

  if (deleteError) {
    const hint =
      deleteError.message?.includes("entry_source") ||
      deleteError.code === "42703"
        ? " Run migration 043_labour_quote_estimates.sql in Supabase."
        : "";
    throw new Error(`Failed to replace labour estimates.${hint}`);
  }

  const estimateRows = summary.lines.map((line) => {
    const employee = employees.find((row) => row.id === line.employeeId);
    const rate = employee ? employeeCostRate(employee) : null;
    return {
      user_id: user.id,
      project_id: projectId,
      employee_id: line.employeeId,
      hours: line.hours,
      entry_date: now.slice(0, 10),
      notes: "Create Quote labour estimate",
      payment_status: "unpaid" as const,
      entry_source: "quote_estimate" as const,
      quote_id: quote.id,
      pay_rate_snapshot: rate,
    };
  });

  const { error: insertError } = await supabase
    .from("time_entries")
    .insert(estimateRows);

  if (insertError) {
    throw new Error(
      insertError.message || "Failed to save labour cost estimates."
    );
  }

  return { quote: updatedQuote as Quote, projectId };
}

/**
 * Persist confirmed supplier unit prices for EVERY material line.
 * File attachment is optional audit only — it cannot complete step 3 alone.
 */
export async function applySupplierPricesToQuote(
  quote: Quote,
  materials: MaterialItem[],
  updates: { materialId: string; unitPrice: number }[],
  options: {
    file?: File | null;
    removeExistingFile?: boolean;
  } = {}
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");

  if (materials.length === 0) {
    throw new Error("No materials on this quote.");
  }

  if (updates.length !== materials.length) {
    throw new Error(
      "Every material line must have a confirmed unit price before completing Upload Prices."
    );
  }

  const priceById = new Map(
    updates.map((update) => [update.materialId, update.unitPrice])
  );

  for (const item of materials) {
    if (!priceById.has(item.id)) {
      throw new Error(
        `Missing confirmed price for “${item.item || "material"}”.`
      );
    }
    const price = priceById.get(item.id);
    if (price == null || !Number.isFinite(price) || price < 0) {
      throw new Error(
        `Invalid price for “${item.item || "material"}”.`
      );
    }
  }

  const nextMaterials = materials.map((item) => ({
    ...item,
    unitPrice: priceById.get(item.id) as number,
  }));

  const state = quoteToActionState({
    ...quote,
    materials: materialsToStored(nextMaterials),
  });
  state.materials = nextMaterials;

  const totals = calculateVoiceQuoteTotals({
    materials: nextMaterials,
    labourItems: state.labourItems,
    gstRate: state.gstRate,
    pstRate: state.pstRate,
    discountMode: state.discountMode,
    discountAmount: state.discountAmount,
    discountPercent: state.discountPercent,
  });

  const file = options.file ?? null;
  const removeExistingFile = Boolean(options.removeExistingFile);

  let filePath: string | null | undefined = quote.supplier_pricing_file_path ?? null;
  if (removeExistingFile && !file) {
    filePath = null;
  }

  if (file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${quote.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("supplier-pricing")
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      const hint =
        uploadError.message?.toLowerCase().includes("bucket") ||
        uploadError.message?.toLowerCase().includes("mime")
          ? " Run migration 017 (and 025 for spreadsheets) in Supabase if needed."
          : "";
      throw new Error(`Failed to upload pricing file.${hint}`);
    }
    filePath = path;
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("quotes")
    .update({
      materials: materialsToStored(nextMaterials),
      labour_items: labourToStored(state.labourItems),
      subtotal: totals.subtotal,
      tax: totals.gst + totals.pst,
      grand_total: totals.grandTotal,
      supplier_pricing_file_path: filePath,
      supplier_pricing_uploaded_at: now,
      updated_at: now,
    })
    .eq("id", quote.id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message || "Failed to save supplier prices.");
  }

  await ensureProjectForQuote({
    userId: user.id,
    quoteId: quote.id,
    projectName: state.projectName,
    customerId: state.selectedCustomerId,
    customerName: state.customerName,
    materials: nextMaterials,
    labourItems: state.labourItems,
    grandTotal: totals.grandTotal,
  });
}

/**
 * Generate the customer-facing quote PDF and mark step 4 complete.
 */
export async function prepareCustomerQuote(quote: Quote): Promise<{
  quoteId: string;
  pdfPath: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");

  if (!quote.supplier_pricing_uploaded_at) {
    throw new Error("Upload supplier prices before creating the quote.");
  }

  const state = quoteToActionState(quote);
  if (state.materials.length === 0 && state.labourItems.length === 0) {
    throw new Error("Add materials or labour before creating a quote.");
  }

  const totals = calculateVoiceQuoteTotals({
    materials: state.materials,
    labourItems: state.labourItems,
    gstRate: state.gstRate,
    pstRate: state.pstRate,
    discountMode: state.discountMode,
    discountAmount: state.discountAmount,
    discountPercent: state.discountPercent,
  });

  if (totals.grandTotal <= 0) {
    throw new Error(
      "Quote total is $0. Add supplier prices (and labour if needed) first."
    );
  }

  const company = await loadCompanyBrandingForPdf();

  const pdfBlob = await fetchQuotePdfBlob({
    materials: state.materials,
    labourItems: state.labourItems,
    taxRate: state.taxRate,
    gstRate: state.gstRate,
    pstRate: state.pstRate,
    discountMode: state.discountMode,
    discountAmount: state.discountAmount,
    discountPercent: state.discountPercent,
    customerName: state.customerName,
    customerEmail: state.customerEmail,
    customerPhone: state.customerPhone,
    projectName: state.projectName,
    notes: state.notes,
    validityDays: state.validityDays,
    validUntil: state.validUntil,
    priceDisplayMode: state.priceDisplayMode,
    quoteNumber: state.quoteNumber,
    allowDraftPlaceholders: true,
    company,
    template: company.quoteTemplate,
  });

  const path = `${user.id}/${quote.id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("quote-pdfs")
    .upload(path, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("[prepareCustomerQuote] quote-pdfs upload failed:", {
      path,
      message: uploadError.message,
      name: uploadError.name,
      cause: uploadError.cause,
      statusCode:
        "statusCode" in uploadError
          ? (uploadError as { statusCode?: string }).statusCode
          : undefined,
      error: uploadError,
    });
    const detail = uploadError.message?.trim() || "unknown storage error";
    const hint =
      detail.toLowerCase().includes("bucket") ||
      detail.toLowerCase().includes("not found")
        ? " Create the quote-pdfs bucket (run migration 009 or 026)."
        : detail.toLowerCase().includes("row-level security") ||
            detail.toLowerCase().includes("policy") ||
            detail.toLowerCase().includes("unauthorized") ||
            detail.toLowerCase().includes("permission")
          ? " Check quote-pdfs storage RLS policies (migration 009/026)."
          : "";
    throw new Error(`Failed to upload quote PDF: ${detail}.${hint}`);
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("quotes")
    .update({
      pdf_url: path,
      quote_prepared_at: now,
      subtotal: totals.subtotal,
      tax: totals.gst + totals.pst,
      grand_total: totals.grandTotal,
      updated_at: now,
    })
    .eq("id", quote.id)
    .eq("user_id", user.id);

  if (error) {
    const hint =
      error.message?.includes("quote_prepared_at") || error.code === "42703"
        ? " Run migration 024_quote_prepared_at.sql in Supabase."
        : "";
    throw new Error(`Failed to mark quote as prepared.${hint}`);
  }

  return { quoteId: quote.id, pdfPath: path };
}
