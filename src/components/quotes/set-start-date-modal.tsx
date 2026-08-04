"use client";

import { useEffect, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";

export function SetStartDateModal({
  initialDate,
  isSaving,
  onClose,
  onSave,
}: {
  initialDate?: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (startDate: string) => void | Promise<void>;
}) {
  const [startDate, setStartDate] = useState(
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  async function handleSave() {
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setError("Choose a valid start date.");
      return;
    }
    await onSave(startDate);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-navy p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white">Set Start Date</h2>
        <p className="mt-1 text-sm text-slate-400">
          Schedule when this project should begin.
        </p>
        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        <label
          htmlFor="pre-invoice-start-date"
          className="mb-2 mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          Start date
        </label>
        <input
          id="pre-invoice-start-date"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className={touchInput}
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={`${touchBtnSecondary} px-4 text-sm`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className={`${touchBtnPrimary} px-4 text-sm disabled:opacity-40`}
          >
            {isSaving ? "Saving…" : "Save date"}
          </button>
        </div>
      </div>
    </div>
  );
}
