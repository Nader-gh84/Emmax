"use client";

import { useState } from "react";
import { QuoteTemplatePicker } from "@/components/quotes/quote-template-picker";
import { touchBtnPrimary } from "@/components/quotes/ui";
import {
  DEFAULT_QUOTE_TEMPLATE,
  type QuoteTemplateId,
} from "@/lib/pdf/quote-templates";

export function StepQuoteTemplate({
  initialTemplate,
  onComplete,
  onBack,
}: {
  initialTemplate?: QuoteTemplateId;
  onComplete: (template: QuoteTemplateId) => Promise<void>;
  onBack?: () => void;
}) {
  const [template, setTemplate] = useState<QuoteTemplateId>(
    initialTemplate ?? DEFAULT_QUOTE_TEMPLATE
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish() {
    setError(null);
    setIsSaving(true);
    try {
      await onComplete(template);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white">Choose your quote look</h2>
      <p className="mt-2 text-sm text-slate-400">
        Pick a quote PDF template. You can change this later in Advance
        Settings.
      </p>

      <div className="mt-6">
        <QuoteTemplatePicker
          value={template}
          onChange={setTemplate}
          disabled={isSaving}
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Back
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handleFinish()}
          disabled={isSaving}
          className={`${touchBtnPrimary} flex-1`}
        >
          {isSaving ? "Saving…" : "Finish setup"}
        </button>
      </div>
    </div>
  );
}
