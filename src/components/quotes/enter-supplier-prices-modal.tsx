"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatCurrency, type MaterialItem } from "@/types/quote";

type Phase = "source" | "extracting" | "review";

const ACCEPTED =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,application/pdf,image/*,text/plain,text/csv";

function confidenceLabel(confidence: MatchConfidence): string {
  switch (confidence) {
    case "high":
      return "High match";
    case "medium":
      return "Medium match";
    case "low":
      return "Needs review";
    default:
      return "No match — enter manually";
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
      return "bg-red-500/15 text-red-300 ring-red-500/30";
  }
}

function IconCloudUpload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function buildEmptyPrices(materials: MaterialItem[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const item of materials) {
    initial[item.id] = "";
  }
  return initial;
}

function buildConfirmedPrices(materials: MaterialItem[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const item of materials) {
    initial[item.id] =
      Number.isFinite(item.unitPrice) && item.unitPrice >= 0
        ? String(item.unitPrice)
        : "";
  }
  return initial;
}

export type EnterSupplierPricesSavePayload = {
  updates: { materialId: string; unitPrice: number }[];
  file: File | null;
  removeExistingFile: boolean;
};

/**
 * Pre-Invoice step 3: AI extract (same /api/extract-supplier-pricing as Voice
 * Quote Builder) + review, or full manual entry. Save requires EVERY material
 * line to have a confirmed real unit price — no file-only / partial completion.
 */
export function EnterSupplierPricesModal({
  materials,
  existingFilePath,
  pricesAlreadyConfirmed,
  isSaving,
  onClose,
  onSave,
}: {
  materials: MaterialItem[];
  existingFilePath?: string | null;
  /** True when supplier_pricing_uploaded_at is already set (re-edit). */
  pricesAlreadyConfirmed?: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: EnterSupplierPricesSavePayload) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [phase, setPhase] = useState<Phase>(
    pricesAlreadyConfirmed ? "review" : "source"
  );
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SupplierPriceMatchRow[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedExtractedPrice[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>(() =>
    pricesAlreadyConfirmed
      ? buildConfirmedPrices(materials)
      : buildEmptyPrices(materials)
  );
  const [lineFlags, setLineFlags] = useState<
    Record<string, MatchConfidence | "manual">
  >(() => {
    const flags: Record<string, MatchConfidence | "manual"> = {};
    for (const item of materials) {
      flags[item.id] = pricesAlreadyConfirmed ? "manual" : "unmatched";
    }
    return flags;
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && phase !== "extracting" && !isSaving) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSaving, onClose, phase]);

  const missingCount = useMemo(() => {
    return materials.filter((item) => {
      const raw = editedPrices[item.id]?.trim() ?? "";
      if (!raw) return true;
      const price = Number(raw);
      return !Number.isFinite(price) || price < 0;
    }).length;
  }, [editedPrices, materials]);

  const allLinesReady = missingCount === 0 && materials.length > 0;

  function acceptFile(next: File | null) {
    setError(null);
    setFile(next);
  }

  function startManualEntry() {
    setError(null);
    setFile(null);
    setPastedText("");
    setRows([]);
    setUnmatched([]);
    setEditedPrices(
      pricesAlreadyConfirmed
        ? buildConfirmedPrices(materials)
        : buildEmptyPrices(materials)
    );
    const flags: Record<string, MatchConfidence | "manual"> = {};
    for (const item of materials) {
      flags[item.id] = "manual";
    }
    setLineFlags(flags);
    setPhase("review");
  }

  async function handleExtract() {
    setError(null);
    if (!file && !pastedText.trim()) {
      setError("Upload a supplier file or paste pricing text, or enter prices manually.");
      return;
    }

    setPhase("extracting");

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

      const nextPrices = buildEmptyPrices(materials);
      const nextFlags: Record<string, MatchConfidence | "manual"> = {};

      for (const item of materials) {
        nextFlags[item.id] = "unmatched";
      }

      for (const row of nextRows) {
        nextFlags[row.materialId] = row.confidence;
        if (
          row.suggestedUnitPrice != null &&
          Number.isFinite(row.suggestedUnitPrice) &&
          row.suggestedUnitPrice >= 0 &&
          (row.confidence === "high" ||
            row.confidence === "medium" ||
            row.confidence === "low")
        ) {
          nextPrices[row.materialId] = String(row.suggestedUnitPrice);
        }
      }

      setEditedPrices(nextPrices);
      setLineFlags(nextFlags);
      setPhase("review");

      const stillMissing = materials.filter(
        (item) => !(nextPrices[item.id]?.trim())
      ).length;
      if (stillMissing > 0) {
        setError(
          `Ema extracted prices, but ${stillMissing} line${stillMissing === 1 ? "" : "s"} still need a price — enter them manually before saving.`
        );
      }
    } catch (err) {
      setPhase("source");
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't read pricing from this file — try a clearer image or enter manually"
      );
    }
  }

  async function handleSave() {
    setError(null);
    const updates: { materialId: string; unitPrice: number }[] = [];
    const missing: string[] = [];

    for (const item of materials) {
      const raw = editedPrices[item.id]?.trim() ?? "";
      if (!raw) {
        missing.push(item.item || "Material");
        continue;
      }
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) {
        setError(`Invalid price for “${item.item || "material"}”.`);
        return;
      }
      updates.push({ materialId: item.id, unitPrice: price });
    }

    if (missing.length > 0) {
      setError(
        `Every material needs a confirmed unit price before step 3 can complete. Missing: ${missing
          .slice(0, 3)
          .join(", ")}${missing.length > 3 ? ` (+${missing.length - 3} more)` : ""}.`
      );
      return;
    }

    if (updates.length !== materials.length) {
      setError("Every material needs a confirmed unit price before saving.");
      return;
    }

    await onSave({
      updates,
      file,
      removeExistingFile: false,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-navy shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Upload Supplier Prices
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Ema reads the supplier reply and suggests unit prices. Review and
              confirm every line before saving — estimated voice prices are not
              used.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === "extracting" || isSaving}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {phase === "source" || phase === "extracting" ? (
            <div className="space-y-4">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                disabled={phase === "extracting"}
                onChange={(event) =>
                  acceptFile(event.target.files?.[0] ?? null)
                }
              />

              <button
                type="button"
                disabled={phase === "extracting"}
                onClick={() => inputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  acceptFile(event.dataTransfer.files?.[0] ?? null);
                }}
                className={`flex min-h-[132px] w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition ${
                  isDragging
                    ? "border-accent/60 bg-accent/10"
                    : "border-white/20 bg-white/[0.02] hover:border-accent/40 hover:bg-accent/5"
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <IconCloudUpload className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-medium text-white">
                  {file
                    ? file.name
                    : "Drag & drop supplier pricing or click to browse"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  PDF, JPG, PNG, or text · max 15 MB
                </p>
              </button>

              {file ? (
                <button
                  type="button"
                  disabled={phase === "extracting"}
                  onClick={() => {
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="text-xs font-semibold text-red-300 hover:text-red-200"
                >
                  Remove file
                </button>
              ) : null}

              {existingFilePath ? (
                <p className="text-xs text-slate-500">
                  A previous pricing file is already stored on this quote. Upload
                  a new one to replace it after you save.
                </p>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Or paste pricing text
                </span>
                <textarea
                  value={pastedText}
                  onChange={(event) => setPastedText(event.target.value)}
                  rows={5}
                  disabled={phase === "extracting"}
                  placeholder="Paste the supplier’s pricing list or email here…"
                  className={touchTextarea}
                />
              </label>

              {phase === "extracting" ? (
                <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-slate-200">
                  Ema is reading the supplier pricing…
                </div>
              ) : null}

              <button
                type="button"
                disabled={phase === "extracting"}
                onClick={startManualEntry}
                className="text-sm font-semibold text-accent hover:text-blue-400"
              >
                Skip file — enter all prices manually
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-slate-400">
                Confirm a unit price for every material. Lines without a match
                are flagged — fill them in before saving. Voice estimates are
                not carried over.
              </p>

              {!allLinesReady ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {missingCount} of {materials.length} line
                  {materials.length === 1 ? "" : "s"} still need a confirmed
                  unit price.
                </div>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Quote material</th>
                      <th className="px-3 py-2">Match</th>
                      <th className="px-3 py-2 text-right">Unit price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((item) => {
                      const row =
                        rows.find((candidate) => candidate.materialId === item.id) ??
                        null;
                      const flag = lineFlags[item.id] ?? "unmatched";
                      const confidence =
                        flag === "manual"
                          ? ("unmatched" as MatchConfidence)
                          : flag;
                      const raw = editedPrices[item.id] ?? "";
                      const needsPrice = !raw.trim();

                      return (
                        <tr
                          key={item.id}
                          className={`border-t border-white/5 align-top ${
                            needsPrice ? "bg-red-500/[0.04]" : ""
                          }`}
                        >
                          <td className="px-3 py-3">
                            <p className="font-medium text-white">
                              {item.item || "Material"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {[item.brand, `${item.quantity} ${item.unit}`]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {row?.extractedDescription ? (
                              <p className="mt-1 text-xs text-slate-400">
                                Supplier: {row.extractedDescription}
                                {row.extractedBrand
                                  ? ` · ${row.extractedBrand}`
                                  : ""}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                                flag === "manual"
                                  ? "bg-white/10 text-slate-300 ring-white/15"
                                  : confidenceClass(confidence)
                              }`}
                            >
                              {flag === "manual"
                                ? "Manual entry"
                                : confidenceLabel(confidence)}
                            </span>
                            {needsPrice ? (
                              <p className="mt-1.5 text-xs font-medium text-red-300">
                                Required
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={raw}
                              onChange={(event) => {
                                const value = event.target.value;
                                setEditedPrices((current) => ({
                                  ...current,
                                  [item.id]: value,
                                }));
                                if (flag !== "manual" && value.trim()) {
                                  // keep extraction confidence; user may edit
                                } else if (flag === "unmatched" && value.trim()) {
                                  setLineFlags((current) => ({
                                    ...current,
                                    [item.id]: "manual",
                                  }));
                                }
                              }}
                              placeholder="Required"
                              className={`${touchInput} ml-auto min-h-[36px] w-28 px-2 py-1 text-right text-sm ${
                                needsPrice ? "border-red-500/40" : ""
                              }`}
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
                    Found in the file but not matched to a quote row. Use these
                    as a reference when filling unmatched lines above.
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
            disabled={phase === "extracting" || isSaving}
            className={`${touchBtnSecondary} flex-1`}
          >
            Cancel
          </button>
          {phase === "review" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setPhase("source");
                  setError(null);
                }}
                disabled={isSaving}
                className={`${touchBtnSecondary} flex-1`}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || !allLinesReady}
                className={`${touchBtnPrimary} flex-1 disabled:opacity-40`}
              >
                {isSaving
                  ? "Saving…"
                  : allLinesReady
                    ? "Confirm & save prices"
                    : `Fill ${missingCount} price${missingCount === 1 ? "" : "s"}`}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleExtract()}
              disabled={phase === "extracting"}
              className={`${touchBtnPrimary} flex-1`}
            >
              {phase === "extracting" ? "Reading…" : "Extract prices with Ema"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
