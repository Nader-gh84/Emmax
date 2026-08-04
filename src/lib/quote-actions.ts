import { fetchQuotePdfBlob } from "@/lib/quote-pdf-client";
import { ensureProjectForQuote } from "@/lib/ensure-project-for-quote";
import {
  buildNewCustomerPayload,
  buildQuoteInsertPayload,
  buildQuoteRecordPayload,
  type CustomerSelectionMode,
  type PriceDisplayMode,
  type QuoteWizardState,
} from "@/lib/quotes";
import { createClient } from "@/lib/supabase";
import { throwSupabaseError } from "@/lib/supabase/errors";
import type { DiscountMode, LabourItem, MaterialItem } from "@/types/quote";
import { calculateVoiceQuoteTotals } from "@/types/quote";

export interface QuoteActionState {
  quoteId: string | null;
  quoteNumber: string | null;
  transcript: string;
  materials: MaterialItem[];
  labourItems: LabourItem[];
  taxRate: number;
  gstRate: number;
  pstRate: number;
  discountMode: DiscountMode;
  discountAmount: number;
  discountPercent: number;
  customerMode: CustomerSelectionMode;
  selectedCustomerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  notes: string;
  validityDays: number;
  validUntil: string | null;
  priceDisplayMode: PriceDisplayMode;
}

export type QuoteSendRecipient = Pick<
  QuoteActionState,
  | "customerMode"
  | "selectedCustomerId"
  | "customerName"
  | "customerEmail"
  | "customerPhone"
>;

export function toWizardState(state: QuoteActionState): QuoteWizardState {
  return { ...state };
}

async function uploadQuotePdf(
  userId: string,
  quoteId: string,
  blob: Blob
): Promise<string> {
  const supabase = createClient();
  const path = `${userId}/${quoteId}.pdf`;

  const { error } = await supabase.storage
    .from("quote-pdfs")
    .upload(path, blob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    console.error("[uploadQuotePdf] quote-pdfs upload failed:", {
      path,
      message: error.message,
      name: error.name,
      error,
    });
    const detail = error.message?.trim() || "unknown storage error";
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

  return path;
}

async function resolveCustomerForSend(
  state: QuoteActionState,
  userId: string,
  sentAt: string
): Promise<{ customerId: string | null; nextState: QuoteActionState }> {
  let customerId = state.selectedCustomerId;
  let nextState = { ...state };

  if (state.customerMode === "existing" && customerId) {
    const { error } = await createClient()
      .from("customers")
      .update({ last_quoted_at: sentAt })
      .eq("id", customerId)
      .eq("user_id", userId);

    if (error) {
      throw new Error("Failed to update customer quote history.");
    }
  } else if (state.customerMode === "new" && state.customerName.trim()) {
    const { data: insertedCustomer, error } = await createClient()
      .from("customers")
      .insert({
        ...buildNewCustomerPayload(toWizardState(state)),
        user_id: userId,
        last_quoted_at: sentAt,
      })
      .select("id")
      .single();

    if (error || !insertedCustomer) {
      throw new Error("Failed to save customer before sending quote.");
    }

    customerId = insertedCustomer.id;
    nextState = {
      ...state,
      selectedCustomerId: customerId,
      customerMode: "existing",
    };
  } else if (customerId) {
    const { error } = await createClient()
      .from("customers")
      .update({ last_quoted_at: sentAt })
      .eq("id", customerId)
      .eq("user_id", userId);

    if (error) {
      throw new Error("Failed to update customer quote history.");
    }
  }

  return { customerId, nextState };
}

async function upsertQuoteRecord(
  state: QuoteActionState,
  userId: string,
  status: "draft" | "sent",
  customerId: string | null,
  options: {
    sentAt?: string | null;
    pdfUrl?: string | null;
    includePdfUrl?: boolean;
  } = {}
): Promise<{ quoteId: string; quoteNumber: string | null }> {
  const supabase = createClient();
  const opts = options ?? {};
  const wizardState = { ...toWizardState(state), selectedCustomerId: customerId };

  if (state.quoteId) {
    const payload = buildQuoteRecordPayload(
      wizardState,
      userId,
      status,
      customerId,
      opts
    );

    const { data, error } = await supabase
      .from("quotes")
      .update(payload)
      .eq("id", state.quoteId)
      .eq("user_id", userId)
      .select("id, quote_number")
      .single();

    if (error) {
      throwSupabaseError("upsertQuoteRecord.update", error, "Failed to update quote.", {
        quoteId: state.quoteId,
        status,
        payload,
      });
    }

    if (!data) {
      throw new Error("Failed to update quote: row not found or access denied.");
    }

    return {
      quoteId: state.quoteId,
      quoteNumber: data.quote_number ?? state.quoteNumber,
    };
  }

  const payload = buildQuoteInsertPayload(
    wizardState,
    userId,
    status,
    customerId,
    {
      sentAt: opts.sentAt,
      pdfUrl: opts.pdfUrl,
    }
  );

  const { data, error } = await supabase
    .from("quotes")
    .insert(payload)
    .select("id, quote_number")
    .single();

  if (error) {
    throwSupabaseError("upsertQuoteRecord.insert", error, "Failed to save quote.", {
      status,
      payload,
    });
  }

  if (!data) {
    throw new Error("Failed to save quote: insert returned no row.");
  }

  return {
    quoteId: data.id,
    quoteNumber: data.quote_number ?? null,
  };
}

async function ensureConfirmationToken(
  quoteId: string,
  userId: string
): Promise<string> {
  const supabase = createClient();

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("confirmation_token")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throwSupabaseError(
      "ensureConfirmationToken.select",
      error,
      "Failed to load quote confirmation token.",
      { quoteId }
    );
  }

  if (quote.confirmation_token) {
    return quote.confirmation_token;
  }

  const newToken = crypto.randomUUID();
  const { data: updated, error: updateError } = await supabase
    .from("quotes")
    .update({ confirmation_token: newToken })
    .eq("id", quoteId)
    .eq("user_id", userId)
    .select("confirmation_token")
    .single();

  if (updateError || !updated?.confirmation_token) {
    if (updateError) {
      throwSupabaseError(
        "ensureConfirmationToken.update",
        updateError,
        "Failed to create quote confirmation token.",
        { quoteId }
      );
    }

    throw new Error("Failed to create quote confirmation token.");
  }

  return updated.confirmation_token;
}

function buildPdfInput(state: QuoteActionState, allowDraftPlaceholders: boolean) {
  return {
    materials: state.materials,
    labourItems: state.labourItems,
    taxRate: state.gstRate + state.pstRate,
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
    allowDraftPlaceholders,
  };
}

async function buildPdfInputWithBranding(
  state: QuoteActionState,
  allowDraftPlaceholders: boolean
) {
  const { loadCompanyBrandingForPdf } = await import(
    "@/lib/pdf/load-company-branding"
  );
  const company = await loadCompanyBrandingForPdf();
  return {
    ...buildPdfInput(state, allowDraftPlaceholders),
    company,
    template: company.quoteTemplate,
  };
}

export async function saveQuoteDraftWithPdf(
  state: QuoteActionState
): Promise<{ quoteId: string; quoteNumber: string | null; pdfUrl: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to save quotes.");
  }

  if (state.materials.length === 0 && state.labourItems.length === 0) {
    throw new Error("Add at least one material or labour item before saving.");
  }

  const { quoteId, quoteNumber } = await upsertQuoteRecord(
    state,
    user.id,
    "draft",
    state.selectedCustomerId
  );

  const nextState = { ...state, quoteId, quoteNumber };

  const pdfBlob = await fetchQuotePdfBlob(
    await buildPdfInputWithBranding(nextState, true)
  );

  const pdfUrl = await uploadQuotePdf(user.id, quoteId, pdfBlob);

  await upsertQuoteRecord(
    nextState,
    user.id,
    "draft",
    state.selectedCustomerId,
    { pdfUrl, includePdfUrl: true }
  );

  return { quoteId, quoteNumber, pdfUrl };
}

export async function saveQuoteDraft(
  state: QuoteActionState
): Promise<{
  quoteId: string;
  quoteNumber: string | null;
  projectId: string | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to save quotes.");
  }

  if (state.materials.length === 0 && state.labourItems.length === 0) {
    throw new Error("Add at least one material or labour item before saving.");
  }

  const result = await upsertQuoteRecord(
    state,
    user.id,
    "draft",
    state.selectedCustomerId
  );

  const totals = calculateVoiceQuoteTotals({
    materials: state.materials,
    labourItems: state.labourItems,
    gstRate: state.gstRate,
    pstRate: state.pstRate,
    discountMode: state.discountMode,
    discountAmount: state.discountAmount,
    discountPercent: state.discountPercent,
  });

  const projectId = await ensureProjectForQuote({
    userId: user.id,
    quoteId: result.quoteId,
    projectName: state.projectName,
    customerId: state.selectedCustomerId,
    customerName: state.customerName,
    materials: state.materials,
    labourItems: state.labourItems,
    grandTotal: totals.grandTotal,
  });

  const label =
    state.projectName.trim() ||
    result.quoteNumber ||
    "Untitled quote";

  try {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "draft_quote",
        quoteId: result.quoteId,
        message: `Draft saved: ${label}`,
        metadata: {
          quote_number: result.quoteNumber,
          customer_name: state.customerName.trim() || null,
          grand_total: totals.grandTotal,
        },
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error("[saveQuoteDraft] Failed to create draft_quote notification:", {
        status: response.status,
        data,
        quoteId: result.quoteId,
      });
    }
  } catch (error) {
    // Draft save succeeded — notification is best-effort.
    console.error("[saveQuoteDraft] Notification request failed:", error);
  }

  return { ...result, projectId };
}

export async function sendQuoteEmailAndPersist(
  state: QuoteActionState
): Promise<{ quoteId: string; quoteNumber: string | null }> {
  if (!state.customerName.trim() || !state.customerEmail.trim()) {
    throw new Error("Customer name and email are required to send a quote.");
  }

  if (state.materials.length === 0 && state.labourItems.length === 0) {
    throw new Error("Add at least one material or labour item before sending.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to send quotes.");
  }

  const sentAt = new Date().toISOString();
  const { customerId, nextState } = await resolveCustomerForSend(
    state,
    user.id,
    sentAt
  );

  const { quoteId, quoteNumber } = await upsertQuoteRecord(
    nextState,
    user.id,
    "sent",
    customerId,
    { sentAt }
  );

  const confirmationToken = await ensureConfirmationToken(quoteId, user.id);

  let pdfStoragePath: string | null = null;
  const { data: storedQuote } = await supabase
    .from("quotes")
    .select("pdf_url")
    .eq("id", quoteId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (storedQuote?.pdf_url && typeof storedQuote.pdf_url === "string") {
    pdfStoragePath = storedQuote.pdf_url.trim() || null;
  }

  const response = await fetch("/api/send-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: state.customerName,
      customerEmail: state.customerEmail,
      customerPhone: state.customerPhone,
      projectName: state.projectName,
      notes: state.notes,
      validityDays: state.validityDays,
      validUntil: state.validUntil,
      taxRate: state.gstRate + state.pstRate,
      gstRate: state.gstRate,
      pstRate: state.pstRate,
      discountMode: state.discountMode,
      discountAmount: state.discountAmount,
      discountPercent: state.discountPercent,
      priceDisplayMode: state.priceDisplayMode,
      quoteNumber,
      confirmationToken,
      pdfStoragePath,
      materials: state.materials.map(
        ({ item, brand, quantity, unit, unitPrice }) => ({
          item,
          brand,
          quantity,
          unit,
          unitPrice,
        })
      ),
      labourItems: state.labourItems.map(({ description, hours, rate }) => ({
        description,
        hours,
        rate,
      })),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to send quote");
  }

  try {
    const pdfBlob = await fetchQuotePdfBlob(
      await buildPdfInputWithBranding(
        { ...nextState, quoteId, quoteNumber },
        false
      )
    );
    const pdfUrl = await uploadQuotePdf(user.id, quoteId, pdfBlob);
    await upsertQuoteRecord(
      { ...nextState, quoteId, quoteNumber },
      user.id,
      "sent",
      customerId,
      { sentAt, pdfUrl, includePdfUrl: true }
    );
  } catch {
    // PDF upload is best-effort after send succeeds.
  }

  return { quoteId, quoteNumber };
}

export async function sendMaterialsToSupplier(
  state: QuoteActionState,
  input: {
    supplierName: string;
    supplierEmail: string;
    messageBody: string;
  }
): Promise<{
  quoteId: string;
  quoteNumber: string | null;
  projectId: string | null;
}> {
  if (state.materials.length === 0) {
    throw new Error("Add at least one material before sending to a supplier.");
  }

  if (!input.supplierEmail.trim()) {
    throw new Error("Supplier email is required.");
  }

  if (!input.messageBody.trim()) {
    throw new Error("Message body is required.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to send to a supplier.");
  }

  // Persist quote so supplier_price notifications can link back to it.
  // Do not change an already-sent quote's status.
  let quoteId = state.quoteId;
  let quoteNumber = state.quoteNumber;

  if (!quoteId) {
    const saved = await upsertQuoteRecord(
      state,
      user.id,
      "draft",
      state.selectedCustomerId
    );
    quoteId = saved.quoteId;
    quoteNumber = saved.quoteNumber;
  }

  // Always send the full detailed materials list — never labour, never prices.
  const response = await fetch("/api/send-supplier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supplierName: input.supplierName.trim(),
      supplierEmail: input.supplierEmail.trim(),
      messageBody: input.messageBody.trim(),
      projectName: state.projectName,
      quoteId,
      materials: state.materials.map(({ item, brand, quantity, unit }) => ({
        item,
        brand,
        quantity,
        unit,
      })),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error || "Failed to send supplier email"
    );
  }

  // Create (or refresh) a projects row so the Pre-Invoices dashboard can list
  // this job before the customer accepts the quote.
  const projectId = await ensureProjectForQuote({
    userId: user.id,
    quoteId,
    projectName: state.projectName,
    customerId: state.selectedCustomerId,
    customerName: state.customerName,
    materials: state.materials,
    labourItems: state.labourItems,
    grandTotal: calculateVoiceQuoteTotals({
      materials: state.materials,
      labourItems: state.labourItems,
      gstRate: state.gstRate,
      pstRate: state.pstRate,
      discountMode: state.discountMode,
      discountAmount: state.discountAmount,
      discountPercent: state.discountPercent,
    }).grandTotal,
  });

  return { quoteId, quoteNumber, projectId };
}
