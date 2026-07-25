"use client";

import { useState } from "react";
import { StepCustomer } from "@/components/quotes/step-customer";
import { StepIndicator } from "@/components/quotes/step-indicator";
import { StepMaterials } from "@/components/quotes/step-materials";
import { StepPreview } from "@/components/quotes/step-preview";
import { StepVoice } from "@/components/quotes/step-voice";
import { MaterialItem, createMaterialItem } from "@/types/quote";

interface ExtractedMaterial {
  item: string;
  brand: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export function NewQuoteWizard() {
  const [step, setStep] = useState(1);
  const [transcript, setTranscript] = useState("");
  const [voiceProcessed, setVoiceProcessed] = useState(false);
  const [materials, setMaterials] = useState<MaterialItem[]>([
    createMaterialItem(),
  ]);
  const [taxRate, setTaxRate] = useState(13);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

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

  async function handleSendQuote() {
    setIsSending(true);
    setActionMessage(null);

    try {
      const response = await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          projectName,
          notes,
          validityDays,
          taxRate,
          materials: materials.map(({ item, brand, quantity, unit, unitPrice }) => ({
            item,
            brand,
            quantity,
            unit,
            unitPrice,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send quote");
      }

      setActionMessage(`Quote sent to ${customerEmail}!`);
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Failed to send quote"
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleSaveDraft() {
    setActionMessage("Quote saved as draft. (Database storage coming soon)");
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">New Quote</h1>
        <p className="mt-1 text-base text-slate-400">
          Create a professional quote with your voice.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      {actionMessage && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-base ${
            actionMessage.startsWith("Quote sent")
              ? "border-accent/30 bg-accent/10 text-accent"
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
          onMaterialsChange={setMaterials}
          onTaxRateChange={setTaxRate}
          onReRecord={handleReRecord}
          onContinue={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepCustomer
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          projectName={projectName}
          notes={notes}
          validityDays={validityDays}
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
