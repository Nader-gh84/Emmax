"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import { formatCurrency, type MaterialItem } from "@/types/quote";

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".csv",
  ".xlsx",
  ".xls",
] as const;

const ACCEPTED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_FILE_BYTES = 15 * 1024 * 1024;

function IconCloudUpload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function IconDocument({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function fileNameFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const parts = path.split("/");
  const last = parts[parts.length - 1] || path;
  return last.replace(/^\d+-/, "");
}

function isAllowedFile(file: File): boolean {
  if (file.size > MAX_FILE_BYTES) return false;
  if (file.type && ACCEPTED_MIME.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export type EnterSupplierPricesSavePayload = {
  updates: { materialId: string; unitPrice: number }[];
  file: File | null;
  /** When true, clear any existing supplier_pricing_file_path on save. */
  removeExistingFile: boolean;
};

/**
 * Manual supplier price entry + optional file attachment for Pre-Invoice step 3.
 * File alone OR complete unit prices can mark the step complete.
 */
export function EnterSupplierPricesModal({
  materials,
  existingFilePath,
  isSaving,
  onClose,
  onSave,
}: {
  materials: MaterialItem[];
  existingFilePath?: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: EnterSupplierPricesSavePayload) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const item of materials) {
      initial[item.id] =
        item.unitPrice > 0 ? String(item.unitPrice) : "";
    }
    return initial;
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingLabel =
    !removeExistingFile && !file
      ? fileNameFromPath(existingFilePath)
      : null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewTotal = useMemo(() => {
    return materials.reduce((sum, item) => {
      const raw = prices[item.id]?.trim() ?? "";
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) return sum;
      return sum + item.quantity * price;
    }, 0);
  }, [materials, prices]);

  function acceptFile(next: File | null) {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!isAllowedFile(next)) {
      setError(
        "Use a PDF, image (JPG/PNG), or spreadsheet (CSV/XLSX) under 15 MB."
      );
      return;
    }
    setFile(next);
    setRemoveExistingFile(false);
  }

  function clearAttachment() {
    setFile(null);
    setRemoveExistingFile(Boolean(existingFilePath));
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSave() {
    setError(null);

    const updates: { materialId: string; unitPrice: number }[] = [];
    let anyPriceFilled = false;
    let anyPriceMissing = false;

    for (const item of materials) {
      const raw = prices[item.id]?.trim() ?? "";
      if (!raw) {
        anyPriceMissing = true;
        continue;
      }
      anyPriceFilled = true;
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) {
        setError(`Invalid price for “${item.item || "material"}”.`);
        return;
      }
      updates.push({ materialId: item.id, unitPrice: price });
    }

    const hasAttachment = Boolean(file) || Boolean(existingLabel);

    // File alone is enough to complete step 3 (audit copy of supplier quote).
    // If entering prices without a file, require every line.
    if (!hasAttachment && !anyPriceFilled) {
      setError(
        "Enter unit prices or attach the supplier pricing file (or both)."
      );
      return;
    }

    if (anyPriceFilled && anyPriceMissing && !hasAttachment) {
      setError("Enter a unit price for every material, or attach a file.");
      return;
    }

    if (anyPriceFilled && anyPriceMissing && hasAttachment) {
      // Partial prices + file: only save the filled lines + attachment.
    } else if (anyPriceFilled && anyPriceMissing) {
      setError("Enter a unit price for every material.");
      return;
    }

    await onSave({
      updates,
      file,
      removeExistingFile: removeExistingFile && !file,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-navy shadow-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Enter Supplier Prices
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Type unit prices and/or attach the supplier quote (PDF, image, or
                spreadsheet). Attachment is optional — either prices or a file
                completes this step.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <section className="mb-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Attachments (Optional)
            </h3>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                acceptFile(next);
              }}
            />

            {file || existingLabel ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.03] px-3 py-3">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/25">
                    <IconDocument className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {file?.name || existingLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {file
                      ? `${(file.size / 1024).toFixed(0)} KB · ready to upload`
                      : "Saved on this quote"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => inputRef.current?.click()}
                    className={`${touchBtnSecondary} px-3 py-1.5 text-xs`}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={clearAttachment}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSaving}
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
                  const next = event.dataTransfer.files?.[0] ?? null;
                  acceptFile(next);
                }}
                className={`mt-3 flex min-h-[132px] w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition ${
                  isDragging
                    ? "border-accent/60 bg-accent/10"
                    : "border-white/20 bg-white/[0.02] hover:border-accent/40 hover:bg-accent/5"
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <IconCloudUpload className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-medium text-white">
                  Drag & drop files here or click to upload
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  PDF, JPG, PNG, CSV, XLSX · max 15 MB
                </p>
              </button>
            )}
          </section>

          {materials.length === 0 ? (
            <p className="text-sm text-slate-400">No materials on this quote.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-2 font-medium">Description</th>
                  <th className="pb-2 pr-2 font-medium">Qty</th>
                  <th className="pb-2 pr-2 font-medium">Unit price</th>
                  <th className="pb-2 font-medium">Line</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item) => {
                  const price = Number(prices[item.id] || 0);
                  const line =
                    Number.isFinite(price) && price >= 0
                      ? item.quantity * price
                      : 0;
                  return (
                    <tr key={item.id} className="border-b border-white/5">
                      <td className="py-3 pr-2">
                        <p className="font-medium text-white">
                          {item.item || "Material"}
                        </p>
                        {item.brand ? (
                          <p className="text-xs text-slate-500">{item.brand}</p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-2 text-slate-300">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={prices[item.id] ?? ""}
                          onChange={(event) =>
                            setPrices((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          className={`${touchInput} min-h-[36px] w-28 px-2 py-1 text-sm`}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-3 text-slate-200">
                        {formatCurrency(line)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Materials total:{" "}
            <span className="font-semibold text-white">
              {formatCurrency(previewTotal)}
            </span>
          </p>
          <div className="flex gap-2">
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
              disabled={isSaving || (materials.length === 0 && !file && !existingLabel)}
              className={`${touchBtnPrimary} px-4 text-sm disabled:opacity-40`}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
