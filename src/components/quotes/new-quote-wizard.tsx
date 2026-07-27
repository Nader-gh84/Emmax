"use client";

import { useCallback, useEffect, useState } from "react";
import { StepCustomer } from "@/components/quotes/step-customer";
import { StepIndicator } from "@/components/quotes/step-indicator";
import { StepMaterials } from "@/components/quotes/step-materials";
import { StepPreview } from "@/components/quotes/step-preview";
import { StepVoice } from "@/components/quotes/step-voice";
import {
  saveQuoteDraftWithPdf,
  sendQuoteEmailAndPersist,
  type QuoteActionState,
} from "@/lib/quote-actions";
import {
  buildNewCustomerPayload,
  buildQuoteRecordPayload,
  quoteToWizardState,
  type CustomerSelectionMode,
  type QuoteWizardState,
} from "@/lib/quotes";
import { createClient } from "@/lib/supabase";
import {
  MaterialItem,
  Quote,
  createMaterialItem,
} from "@/types/quote";

interface ExtractedMaterial {
  item: string;
  brand: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface NewQuoteWizardProps {
  draftId?: string;
}

function getWizardStateSnapshot(state: {
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
}): QuoteWizardState {
  return {
    quoteId: state.quoteId,
    transcript: state.transcript,
    materials: state.materials,
    taxRate: state.taxRate,
    customerMode: state.customerMode,
    selectedCustomerId: state.selectedCustomerId,
    customerName: state.customerName,
    customerEmail: state.customerEmail,
    customerPhone: state.customerPhone,
    projectName: state.projectName,
    notes: state.notes,
    validityDays: state.validityDays,
  };
}

export function NewQuoteWizard({ draftId }: NewQuoteWizardProps) {
  const [step, setStep] = useState(1);
  const [quoteId, setQuoteId] = useState<string | null>(draftId ?? null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(draftId));
  const [transcript, setTranscript] = useState("");
  const [voiceProcessed, setVoiceProcessed] = useState(false);
  const [materials, setMaterials] = useState<MaterialItem[]>([
    createMaterialItem(),
  ]);
  const [taxRate, setTaxRate] = useState(13);
  const [customerMode, setCustomerMode] =
    useState<CustomerSelectionMode>("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const loadDraft = useCallback(async (id: string) => {
    setIsLoadingDraft(true);
    setActionMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .eq("status", "draft")
      .single();

    if (error || !data) {
      setActionMessage("Failed to load draft quote. Please try again.");
      setIsLoadingDraft(false);
      return;
    }

    const quote = data as Quote;
    const wizardState = quoteToWizardState(quote);

    setQuoteId(quote.id);
    setTranscript(wizardState.transcript);
    setVoiceProcessed(Boolean(wizardState.transcript));
    setMaterials(
      wizardState.materials.length > 0
        ? wizardState.materials
        : [createMaterialItem()]
    );
    setTaxRate(wizardState.taxRate);
    setCustomerMode(wizardState.customerMode);
    setSelectedCustomerId(wizardState.selectedCustomerId);
    setCustomerName(wizardState.customerName);
    setCustomerEmail(wizardState.customerEmail);
    setCustomerPhone(wizardState.customerPhone);
    setProjectName(wizardState.projectName);
    setNotes(wizardState.notes);
    setValidityDays(wizardState.validityDays);
    setStep(3);
    setIsLoadingDraft(false);
  }, []);

  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId, loadDraft]);

  function handleVoiceProcessed(
    newTranscript: string,
    scopeOfWork: string,
    extractedMaterials: unknown[]
  ) {
    setTranscript(newTranscript);
    setNotes(scopeOfWork);
    setVoiceProcessed(true);

    const parsed = (extractedMaterials as ExtractedMaterial[]).map((m) =>
      createMaterialItem({
        item: m.item ?? "",
        brand: m.brand ?? "",
        quantity: m.quantity ?? 1,
        unit: m.unit ?? "each",
        unitPrice: m.unitPrice ?? 0,
      })
    );

    setMaterials(parsed.length > 0 ? parsed : [createMaterialItem()]);
  }

  function handleContinueFromVoice() {
    setStep(2);
  }

  function handleReRecord() {
    setStep(1);
    setTranscript("");
    setVoiceProcessed(false);
    setMaterials([createMaterialItem()]);
  }

  function getQuoteActionState(): QuoteActionState {
    return {
      quoteId,
      transcript,
      materials,
      taxRate,
      customerMode,
      selectedCustomerId,
      customerName,
      customerEmail,
      customerPhone,
      projectName,
      notes,
      validityDays,
    };
  }

  async function handleMaterialsSaveDraft() {
    const result = await saveQuoteDraftWithPdf(getQuoteActionState());
    setQuoteId(result.quoteId);
    return result;
  }

  async function handleMaterialsSendQuote() {
    const result = await sendQuoteEmailAndPersist(getQuoteActionState());
    setQuoteId(result.quoteId);
  }

  function handleCustomerFieldChange(
    field: "customerName" | "customerEmail" | "customerPhone",
    value: string
  ) {
    handleCustomerChange(field, value);
  }

  function handleCustomerChange(field: string, value: string | number) {
    switch (field) {
      case "customerName":
        setCustomerName(String(value));
        break;
      case "customerEmail":
        setCustomerEmail(String(value));
        break;
      case "customerPhone":
        setCustomerPhone(String(value));
        break;
      case "projectName":
        setProjectName(String(value));
        break;
      case "notes":
        setNotes(String(value));
        break;
      case "validityDays":
        setValidityDays(Number(value));
        break;
    }
  }

  async function persistQuote(status: "draft" | "sent", sentAt?: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in to save quotes.");
    }

    const state = getWizardStateSnapshot({
      quoteId,
      transcript,
      materials,
      taxRate,
      customerMode,
      selectedCustomerId,
      customerName,
      customerEmail,
      customerPhone,
      projectName,
      notes,
      validityDays,
    });

    let customerId = selectedCustomerId;

    if (status === "sent") {
      if (customerMode === "existing" && customerId) {
        const { error: customerUpdateError } = await supabase
          .from("customers")
          .update({ last_quoted_at: sentAt ?? new Date().toISOString() })
          .eq("id", customerId)
          .eq("user_id", user.id);

        if (customerUpdateError) {
          throw new Error("Failed to update customer quote history.");
        }
      } else if (customerMode === "new" && customerName.trim()) {
        const { data: insertedCustomer, error: insertCustomerError } =
          await supabase
            .from("customers")
            .insert({
              ...buildNewCustomerPayload(state),
              user_id: user.id,
              last_quoted_at: sentAt ?? new Date().toISOString(),
            })
            .select("id")
            .single();

        if (insertCustomerError || !insertedCustomer) {
          throw new Error("Failed to save customer before sending quote.");
        }

        customerId = insertedCustomer.id;
        setSelectedCustomerId(customerId);
        setCustomerMode("existing");
      } else if (customerId) {
        const { error: customerUpdateError } = await supabase
          .from("customers")
          .update({ last_quoted_at: sentAt ?? new Date().toISOString() })
          .eq("id", customerId)
          .eq("user_id", user.id);

        if (customerUpdateError) {
          throw new Error("Failed to update customer quote history.");
        }
      }
    }

    const payload = buildQuoteRecordPayload(
      { ...state, selectedCustomerId: customerId },
      user.id,
      status,
      customerId,
      sentAt
    );

    if (quoteId) {
      const { error: updateError } = await supabase
        .from("quotes")
        .update(payload)
        .eq("id", quoteId)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error("Failed to update quote.");
      }

      return quoteId;
    }

    const { data: insertedQuote, error: insertError } = await supabase
      .from("quotes")
      .insert(payload)
      .select("id")
      .single();

    if (insertError || !insertedQuote) {
      throw new Error("Failed to save quote.");
    }

    setQuoteId(insertedQuote.id);
    return insertedQuote.id;
  }

  async function handleSendQuote() {
    if (!customerName.trim() || !customerEmail.trim()) {
      setActionMessage("Customer name and email are required to send a quote.");
      return;
    }

    setIsSending(true);
    setActionMessage(null);

    try {
      const result = await sendQuoteEmailAndPersist(getQuoteActionState());
      setQuoteId(result.quoteId);
      setActionMessage(`Quote sent to ${customerEmail}!`);
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Failed to send quote"
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveDraft() {
    setIsSavingDraft(true);
    setActionMessage(null);

    try {
      await persistQuote("draft");
      setActionMessage("Quote saved as draft.");
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Failed to save draft"
      );
    } finally {
      setIsSavingDraft(false);
    }
  }

  if (isLoadingDraft) {
    return (
      <main className="flex min-h-[40vh] flex-col items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
        <p className="mt-4 text-base text-slate-400">Loading draft quote...</p>
      </main>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          {draftId ? "Edit Draft Quote" : "New Quote"}
        </h1>
        <p className="mt-1 text-base text-slate-400">
          Create a professional quote with your voice.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      {actionMessage && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-base ${
            actionMessage.startsWith("Quote sent") ||
            actionMessage.startsWith("Quote saved") ||
            actionMessage.startsWith("Saved to Drafts")
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {actionMessage}
        </div>
      )}

      {step === 1 && (
        <StepVoice
          materials={materials}
          taxRate={taxRate}
          transcript={transcript}
          processed={voiceProcessed}
          onProcessed={handleVoiceProcessed}
          onContinue={handleContinueFromVoice}
        />
      )}

      {step === 2 && (
        <StepMaterials
          materials={materials}
          taxRate={taxRate}
          quoteState={getQuoteActionState()}
          onMaterialsChange={setMaterials}
          onTaxRateChange={setTaxRate}
          onReRecord={handleReRecord}
          onQuoteIdChange={setQuoteId}
          onCustomerModeChange={setCustomerMode}
          onSelectCustomer={setSelectedCustomerId}
          onCustomerFieldChange={handleCustomerFieldChange}
          onSaveDraftWithPdf={handleMaterialsSaveDraft}
          onSendQuote={handleMaterialsSendQuote}
        />
      )}

      {step === 3 && (
        <StepCustomer
          customerMode={customerMode}
          selectedCustomerId={selectedCustomerId}
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          projectName={projectName}
          notes={notes}
          validityDays={validityDays}
          onModeChange={setCustomerMode}
          onSelectCustomer={setSelectedCustomerId}
          onChange={handleCustomerChange}
          onBack={() => setStep(2)}
          onContinue={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <StepPreview
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          projectName={projectName}
          notes={notes}
          validityDays={validityDays}
          materials={materials}
          taxRate={taxRate}
          onSend={handleSendQuote}
          isSending={isSending}
          onSaveDraft={handleSaveDraft}
          isSavingDraft={isSavingDraft}
        />
      )}

      {transcript && step > 1 && (
        <details className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <summary className="cursor-pointer text-base font-medium text-slate-400">
            View original transcript
          </summary>
          <p className="mt-3 break-words text-base leading-relaxed text-slate-300">
            {transcript}
          </p>
        </details>
      )}
    </div>
  );
}
