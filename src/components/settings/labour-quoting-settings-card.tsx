"use client";

/**
 * Labour quoting preferences under Settings → Employees.
 * Threshold used at Create Quote when comparing labour cost vs customer price.
 */

import { useCallback, useEffect, useState } from "react";
import { touchBtnPrimary, touchInput } from "@/components/quotes/ui";
import { createClient } from "@/lib/supabase";
import {
  DEFAULT_LABOUR_MARGIN_WARN_PERCENT,
  normalizeLabourMarginWarnPercent,
} from "@/types/labour-quoting";

export function LabourQuotingSettingsCard() {
  const [value, setValue] = useState(
    String(DEFAULT_LABOUR_MARGIN_WARN_PERCENT)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to load labour settings.");
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("business_profiles")
      .select("labour_margin_warn_percent")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      const missingColumn =
        fetchError.code === "42703" ||
        fetchError.message?.includes("labour_margin_warn_percent");
      setError(
        missingColumn
          ? "Failed to load labour settings. Run migration 043_labour_quote_estimates.sql in Supabase."
          : "Failed to load labour settings. Please try again."
      );
      return;
    }

    setValue(
      String(
        normalizeLabourMarginWarnPercent(data?.labour_margin_warn_percent)
      )
    );
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    }
    void init();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalized = normalizeLabourMarginWarnPercent(value);
    setValue(String(normalized));

    setIsSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to save labour settings.");
      }

      const { error: updateError } = await supabase
        .from("business_profiles")
        .update({
          labour_margin_warn_percent: normalized,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        const missingColumn =
          updateError.code === "42703" ||
          updateError.message?.includes("labour_margin_warn_percent");
        throw new Error(
          missingColumn
            ? "Failed to save. Run migration 043_labour_quote_estimates.sql in Supabase."
            : "Failed to save labour settings. Please try again."
        );
      }

      setSuccess(
        normalized === 0
          ? "Saved — warn only when labour margin is zero or negative."
          : `Saved — warn when labour margin falls to ${normalized}% or below.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save labour settings."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-semibold text-white">Labour quoting</h3>
      <p className="mt-1 text-sm text-slate-400">
        At Create Quote, Ema compares what you pay employees (cost) to what you
        charge the customer (price). Set when she should warn you.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : (
        <form onSubmit={(event) => void handleSave(event)} className="mt-4">
          <label
            htmlFor="labour-margin-warn"
            className="block text-sm font-medium text-slate-300"
          >
            Warn me when labour margin falls below
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <input
                id="labour-margin-warn"
                type="number"
                min={0}
                max={100}
                step={0.5}
                inputMode="decimal"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setSuccess(null);
                }}
                className={`${touchInput} w-28`}
                aria-describedby="labour-margin-warn-hint"
              />
              <span className="text-sm text-slate-400">%</span>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className={`${touchBtnPrimary} w-full sm:w-auto`}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
          <p id="labour-margin-warn-hint" className="mt-2 text-xs text-slate-500">
            0% (default) warns only when margin is zero or negative. This is a
            warning, not a block — you can still proceed.
          </p>
        </form>
      )}

      {success ? (
        <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}
    </section>
  );
}
