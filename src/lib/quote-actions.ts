import { fetchQuotePdfBlob } from "@/lib/quote-pdf-client";
import {
  buildNewCustomerPayload,
  buildQuoteInsertPayload,
  buildQuoteRecordPayload,
  type CustomerSelectionMode,
  type QuoteWizardState,
} from "@/lib/quotes";
import { createClient } from "@/lib/supabase";
import { throwSupabaseError } from "@/lib/supabase/errors";
import type { MaterialItem } from "@/types/quote";

export interface QuoteActionState {
  quoteId: string | null;
  transcript: string;
  materials: MaterialItem[];
  taxRate: number;
  customerMode: CustomerSelectionMode;
  selectedCustomerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  notes: string;
  validityDays: number;
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
    throw new Error("Failed to upload quote PDF.");
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
): Promise<string> {
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
      .select("id")
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

    return state.quoteId;
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
    .select("id")
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

  return data.id;
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

export async function saveQuoteDraftWithPdf(
  state: QuoteActionState
): Promise<{ quoteId: string; pdfUrl: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to save quotes.");
  }

  const quoteId = await upsertQuoteRecord(
    state,
    user.id,
    "draft",
    state.selectedCustomerId
  );

  const pdfBlob = await fetchQuotePdfBlob({
    materials: state.materials,
    taxRate: state.taxRate,
    projectName: state.projectName,
    notes: state.notes,
    validityDays: state.validityDays,
    allowDraftPlaceholders: true,
  });

  const pdfUrl = await uploadQuotePdf(user.id, quoteId, pdfBlob);

  await upsertQuoteRecord(
    { ...state, quoteId },
    user.id,
    "draft",
    state.selectedCustomerId,
    { pdfUrl, includePdfUrl: true }
  );

  return { quoteId, pdfUrl };
}

export async function sendQuoteEmailAndPersist(
  state: QuoteActionState
): Promise<{ quoteId: string }> {
  if (!state.customerName.trim() || !state.customerEmail.trim()) {
    throw new Error("Customer name and email are required to send a quote.");
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

  const quoteId = await upsertQuoteRecord(
    nextState,
    user.id,
    "sent",
    customerId,
    { sentAt }
  );

  const confirmationToken = await ensureConfirmationToken(quoteId, user.id);

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
      taxRate: state.taxRate,
      confirmationToken,
      materials: state.materials.map(
        ({ item, brand, quantity, unit, unitPrice }) => ({
          item,
          brand,
          quantity,
          unit,
          unitPrice,
        })
      ),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to send quote");
  }

  try {
    const pdfBlob = await fetchQuotePdfBlob({
      materials: state.materials,
      taxRate: state.taxRate,
      customerName: state.customerName,
      customerEmail: state.customerEmail,
      customerPhone: state.customerPhone,
      projectName: state.projectName,
      notes: state.notes,
      validityDays: state.validityDays,
    });
    const pdfUrl = await uploadQuotePdf(user.id, quoteId, pdfBlob);
    await upsertQuoteRecord(
      { ...nextState, quoteId },
      user.id,
      "sent",
      customerId,
      { sentAt, pdfUrl, includePdfUrl: true }
    );
  } catch {
    // PDF upload is best-effort after send succeeds.
  }

  return { quoteId };
}
