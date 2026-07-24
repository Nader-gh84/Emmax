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
  quantity: number;
  unit: string;
  unitPrice: number;
}

export function NewQuoteWizard() {
  const [step, setStep] = useState(1);
  const [transcript, setTranscript] = useState("");
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

  function handleVoiceComplete(
    newTranscript: string,
    scopeOfWork: string,
    extractedMaterials: unknown[]
  ) {
    setTranscript(newTranscript);
    setNotes(scopeOfWork);

    const parsed = (extractedMaterials as ExtractedMaterial[]).map((m) =>
      createMaterialItem({
        item: m.item ?? "",
        quantity: m.quantity ?? 1,
        unit: m.unit ?? "each",
        unitPrice: m.unitPrice ?? 0,
      })
    );

    setMaterials(parsed.length > 0 ? parsed : [createMaterialItem()]);
    setStep(2);
  }

  function handleReRecord() {
    setStep(1);
    setTranscript("");
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

  function handleSendQuote() {
    setActionMessage("Quote sent! (Email delivery coming soon)");
  }

  function handleDownloadPdf() {
    setActionMessage("PDF download coming soon.");
  }

  function handleSaveDraft() {
    setActionMessage("Quote saved as draft. (Database storage coming soon)");
  }

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white">New Quote</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create a professional quote with your voice.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      {actionMessage && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {actionMessage}
        </div>
      )}

      {step === 1 && <StepVoice onComplete={handleVoiceComplete} />}

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
          onDownload={handleDownloadPdf}
          onSaveDraft={handleSaveDraft}
        />
      )}

      {transcript && step > 1 && (
        <details className="mt-10 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-400">
            View original transcript
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {transcript}
          </p>
        </details>
      )}
    </div>
  );
}
