"use client";

import { useState } from "react";
import { touchBtnPrimary, touchInput } from "@/components/quotes/ui";

interface StepQuoteDefaultsProps {
  onComplete: (defaults: {
    defaultTaxRate: number;
    defaultValidityDays: number;
  }) => void | Promise<void>;
}

export function StepQuoteDefaults({ onComplete }: StepQuoteDefaultsProps) {
  const [defaultTaxRate, setDefaultTaxRate] = useState(13);
  const [defaultValidityDays, setDefaultValidityDays] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await onComplete({ defaultTaxRate, defaultValidityDays });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save defaults");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">
        Quote defaults
      </h2>
      <p className="mt-2 text-center text-base text-slate-400">
        Set your default tax rate and quote validity. You can change these
        later on any quote.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-base font-medium text-slate-300">
            Default tax rate (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={defaultTaxRate}
            onChange={(event) =>
              setDefaultTaxRate(parseFloat(event.target.value) || 0)
            }
            className={`${touchInput} mt-1.5`}
          />
        </div>

        <div>
          <label className="block text-base font-medium text-slate-300">
            Default quote validity (days)
          </label>
          <input
            type="number"
            min="1"
            value={defaultValidityDays}
            onChange={(event) =>
              setDefaultValidityDays(parseInt(event.target.value, 10) || 30)
            }
            className={`${touchInput} mt-1.5`}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className={`${touchBtnPrimary} w-full`}
        >
          {isSaving ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
