"use client";

/**
 * Materials markup % under Settings → Employees.
 * Default sell = cost × (1 + %/100) at Upload Prices.
 * Labour sell is the rate/amount the contractor types at Create Quote — no markup %.
 */

import { useCallback, useEffect, useState } from "react";
import { touchBtnPrimary, touchInput } from "@/components/quotes/ui";
import {
  DEFAULT_MATERIALS_MARKUP_PERCENT,
  normalizeMaterialsMarkupPercent,
} from "@/lib/materials-pricing";
import { createClient } from "@/lib/supabase";

export function MarkupSettingsCard() {
  const [materialsMarkup, setMaterialsMarkup] = useState(
    String(DEFAULT_MATERIALS_MARKUP_PERCENT)
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
      setError("You must be logged in to load markup settings.");
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("business_profiles")
      .select("materials_markup_percent")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      const missingColumn =
        fetchError.code === "42703" ||
        fetchError.message?.includes("materials_markup_percent");
      setError(
        missingColumn
          ? "Failed to load markup settings. Run migration 044_materials_cost_price_split.sql in Supabase."
          : "Failed to load markup settings. Please try again."
      );
      return;
    }

    setMaterialsMarkup(
      String(normalizeMaterialsMarkupPercent(data?.materials_markup_percent))
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

    const nextMaterials = normalizeMaterialsMarkupPercent(materialsMarkup);
    setMaterialsMarkup(String(nextMaterials));

    setIsSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to save markup settings.");
      }

      const { error: updateError } = await supabase
        .from("business_profiles")
        .update({
          materials_markup_percent: nextMaterials,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        const missingColumn =
          updateError.code === "42703" ||
          updateError.message?.includes("materials_markup_percent");
        throw new Error(
          missingColumn
            ? "Failed to save. Run migration 044_materials_cost_price_split.sql in Supabase."
            : "Failed to save markup settings. Please try again."
        );
      }

      setSuccess(`Saved — materials markup ${nextMaterials}%.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save markup settings."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-semibold text-white">Default markups</h3>
      <p className="mt-1 text-sm text-slate-400">
        Materials markup sets the starting sell price when you apply supplier
        costs. You can still edit sell prices line by line after apply. Labour
        is priced at Create Quote (T&amp;M sell rate or flat amount), not by a
        markup percentage.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : (
        <form onSubmit={(event) => void handleSave(event)} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="materials-markup"
              className="block text-sm font-medium text-slate-300"
            >
              Materials markup
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="materials-markup"
                type="number"
                min={0}
                max={100}
                step={0.5}
                inputMode="decimal"
                value={materialsMarkup}
                onChange={(event) => {
                  setMaterialsMarkup(event.target.value);
                  setSuccess(null);
                }}
                className={`${touchInput} w-28`}
                aria-describedby="materials-markup-hint"
              />
              <span className="text-sm text-slate-400">%</span>
            </div>
            <p id="materials-markup-hint" className="mt-2 text-xs text-slate-500">
              0% (default) means sell starts equal to supplier cost.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className={`${touchBtnPrimary} w-full sm:w-auto`}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
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
