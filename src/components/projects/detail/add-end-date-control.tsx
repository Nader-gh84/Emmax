"use client";

import { useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import { createClient } from "@/lib/supabase";
import { formatProjectDate } from "@/types/project";

/** Small control to PATCH projects.end_date from the progress section. */
export function AddEndDateControl({
  projectId,
  endDate,
  onEndDateSaved,
}: {
  projectId: string;
  endDate: string | null;
  onEndDateSaved?: (endDate: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(endDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!value) {
      setError("Choose an end date.");
      return;
    }

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("projects")
      .update({ end_date: value, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    if (updateError) {
      setError("Failed to save end date.");
      setBusy(false);
      return;
    }

    onEndDateSaved?.(value);
    setOpen(false);
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(endDate ?? "");
          setError(null);
          setOpen(true);
        }}
        className="text-xs font-semibold text-accent hover:text-blue-400"
      >
        {endDate ? `End ${formatProjectDate(endDate)} · Edit` : "+ Add end date"}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSave(e)}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="min-w-[10rem] flex-1">
        <label
          htmlFor="project-end-date"
          className="block text-xs font-medium text-slate-400"
        >
          End date
        </label>
        <input
          id="project-end-date"
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${touchInput} mt-1`}
          required
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className={`${touchBtnPrimary} px-3 text-sm`}
      >
        {busy ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen(false)}
        className={`${touchBtnSecondary} px-3 text-sm`}
      >
        Cancel
      </button>
      {error ? (
        <p className="w-full text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
