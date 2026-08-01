"use client";

import { useEffect, useMemo, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import type {
  MatchConfidence,
  SupplierPriceMatchRow,
  UnmatchedExtractedPrice,
} from "@/lib/supplier-pricing";
import { createClient } from "@/lib/supabase";
import { formatCurrency, type MaterialItem } from "@/types/quote";

type Step = "upload" | "extracting" | "preview";

function confidenceLabel(confidence: MatchConfidence): string {
  switch (confidence) {
    case "high":
      return "High match";
    case "medium":
      return "Medium match";
    case "low":
      return "Low / review";
    default:
      return "Unmatched";
  }
}

function confidenceClass(confidence: MatchConfidence): string {
  switch (confidence) {
    case "high":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "medium":
      return "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30";
    case "low":
      return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    default:
      return "bg-white/10 text-slate-400 ring-white/15";
  }
}

export function UploadSupplierPricingModal({
  materials,
  quoteId,
  onClose,
  onApply,
}: {
  materials: MaterialItem[];
  quoteId: string | null;
  onClose: () => void;
  onApply: (updates: { materialId: string; unitPrice: number }[]) => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SupplierPriceMatchRow[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedExtractedPrice[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && step !== "extracting") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  async function handleExtract() {
    setError(null);

    if (!file && !pastedText.trim()) {
      setError("Upload a file or paste supplier pricing text.");
      return;
    }

    setStep("extracting");

    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      if (pastedText.trim()) formData.append("text", pastedText.trim());
      formData.append(
        "materials",
        JSON.stringify(
          materials.map(({ id, item, brand, quantity, unit, unitPrice }) => ({
            id,
            item,
            brand,
            quantity,
            unit,
            unitPrice,
          }))
        )
      );

      const response = await fetch("/api/extract-supplier-pricing", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Couldn't read pricing from this file — try a clearer image or enter manually"
        );
      }

      const nextRows = (data.rows as SupplierPriceMatchRow[]) ?? [];
      setRows(nextRows);
      setUnmatched((data.unmatchedExtracted as UnmatchedExtractedPrice[]) ?? []);

      const nextSelected: Record<string, boolean> = {};
      const nextPrices: Record<string, string> = {};
      for (const row of nextRows) {
        nextSelected[row.materialId] = Boolean(
          row.selected && row.suggestedUnitPrice != null
        );
        nextPrices[row.materialId] =
          row.suggestedUnitPrice != null
            ? String(row.suggestedUnitPrice)
            : "";
      }
      setSelected(nextSelected);
      setEditedPrices(nextPrices);
      setStep("preview");
    } catch (err) {
      setStep("upload");
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't read pricing from this file — try a clearer image or enter manually"
      );
    }
  }

  async function uploadFileForAudit(): Promise<string | null> {
    if (!file || !quoteId) return null;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${quoteId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("supplier-pricing")
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("[UploadSupplierPricing] storage upload failed:", uploadError);
      return null;
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        supplier_pricing_file_path: path,
        supplier_pricing_uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[UploadSupplierPricing] quote path update failed:", updateError);
    }

    return path;
  }

  async function handleApply() {
    setIsApplying(true);
    setError(null);

    try {
      const updates: { materialId: string; unitPrice: number }[] = [];

      for (const row of rows) {
        if (!selected[row.materialId]) continue;
        const raw = editedPrices[row.materialId]?.trim() ?? "";
        const price = Number(raw);
        if (!Number.isFinite(price) || price < 0) {
          throw new Error(
            `Enter a valid price for “${row.materialItem || "material"}” or uncheck it.`
          );
        }
        updates.push({ materialId: row.materialId, unitPrice: price });
      }

      if (updates.length === 0) {
        throw new Error("Select at least one matched price to apply.");
      }

      // Best-effort audit upload — do not block applying prices if storage fails.
      if (file) {
        await uploadFileForAudit();
      }

      onApply(updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply prices");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-navy shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Upload Supplier Pricing
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Ema reads the supplier reply and suggests prices — nothing is
              applied until you confirm.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={step === "extracting" || isApplying}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {step === "upload" || step === "extracting" ? (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  File (PDF, JPG, PNG, or text)
                </span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,application/pdf,image/*,text/plain,text/csv"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] ?? null)
                  }
                  disabled={step === "extracting"}
                  className={`${touchInput} file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent`}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Or paste pricing text
                </span>
                <textarea
                  value={pastedText}
                  onChange={(event) => setPastedText(event.target.value)}
                  rows={6}
                  disabled={step === "extracting"}
                  placeholder="Paste the supplier’s pricing list or email here…"
                  className={touchTextarea}
                />
              </label>

              {step === "extracting" ? (
                <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-slate-200">
                  Ema is reading the supplier pricing…
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-slate-400">
                Review matches below. Unmatched items are left alone — edit or
                uncheck before applying.
              </p>

              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Apply</th>
                      <th className="px-3 py-2">Quote material</th>
                      <th className="px-3 py-2">Supplier match</th>
                      <th className="px-3 py-2 text-right">New unit price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const canSelect =
                        row.confidence === "high" ||
                        row.confidence === "medium" ||
                        (row.confidence === "low" &&
                          editedPrices[row.materialId]?.trim());

                      return (
                        <tr
                          key={row.materialId}
                          className="border-t border-white/5 align-top"
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={Boolean(selected[row.materialId])}
                              disabled={
                                row.confidence === "unmatched" &&
                                !editedPrices[row.materialId]?.trim()
                              }
                              onChange={(event) =>
                                setSelected((current) => ({
                                  ...current,
                                  [row.materialId]: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-white/20 bg-navy text-accent"
                              title={
                                canSelect
                                  ? "Include this price"
                                  : "No confident match"
                              }
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-white">
                              {row.materialItem || "Material"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {[row.materialBrand, row.materialUnit]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Current: {formatCurrency(row.currentUnitPrice)}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${confidenceClass(row.confidence)}`}
                            >
                              {confidenceLabel(row.confidence)}
                            </span>
                            {row.extractedDescription ? (
                              <p className="mt-1.5 text-xs text-slate-300">
                                {row.extractedDescription}
                                {row.extractedBrand
                                  ? ` · ${row.extractedBrand}`
                                  : ""}
                              </p>
                            ) : (
                              <p className="mt-1.5 text-xs text-slate-500">
                                No confident match from supplier file
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editedPrices[row.materialId] ?? ""}
                              onChange={(event) => {
                                const value = event.target.value;
                                setEditedPrices((current) => ({
                                  ...current,
                                  [row.materialId]: value,
                                }));
                                if (value.trim()) {
                                  setSelected((current) => ({
                                    ...current,
                                    [row.materialId]: true,
                                  }));
                                }
                              }}
                              placeholder="—"
                              className={`${touchInput} ml-auto min-h-[36px] w-28 px-2 py-1 text-right text-sm`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {unmatched.length > 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Unmatched extracted prices ({unmatched.length})
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {unmatched.map((item, index) => (
                      <li
                        key={`${item.description}-${index}`}
                        className="flex items-center justify-between gap-3 text-sm text-slate-400"
                      >
                        <span className="min-w-0 truncate">
                          {item.description}
                          {item.brand ? ` · ${item.brand}` : ""}
                        </span>
                        <span className="shrink-0 text-slate-300">
                          {formatCurrency(item.unitPrice)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">
                    These were found in the file but not confidently matched to
                    a quote row. Enter a price manually on a row above if
                    needed.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={step === "extracting" || isApplying}
            className={`${touchBtnSecondary} flex-1`}
          >
            Cancel
          </button>
          {step === "preview" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep("upload");
                  setError(null);
                }}
                disabled={isApplying}
                className={`${touchBtnSecondary} flex-1`}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleApply()}
                disabled={isApplying || selectedCount === 0}
                className={`${touchBtnPrimary} flex-1`}
              >
                {isApplying
                  ? "Applying…"
                  : `Apply These Prices (${selectedCount})`}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleExtract()}
              disabled={step === "extracting"}
              className={`${touchBtnPrimary} flex-1`}
            >
              {step === "extracting" ? "Reading…" : "Extract prices"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
