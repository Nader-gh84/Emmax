"use client";

import { useState } from "react";
import { MaterialsPreviewModal } from "@/components/quotes/materials-preview-modal";
import { PostDownloadSheet } from "@/components/quotes/post-download-sheet";
import {
  MaterialItem,
  calculateQuoteTotals,
  createMaterialItem,
  formatCurrency,
  materialLineTotal,
} from "@/types/quote";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import type { QuoteActionState } from "@/lib/quote-actions";
import {
  downloadPdfBlob,
  fetchQuotePdfBlob,
  openSmsWithQuoteMessage,
} from "@/lib/quote-pdf-client";
import type { CustomerSelectionMode } from "@/lib/quotes";

interface StepMaterialsProps {
  materials: MaterialItem[];
  taxRate: number;
  quoteState: QuoteActionState;
  onMaterialsChange: (materials: MaterialItem[]) => void;
  onTaxRateChange: (rate: number) => void;
  onReRecord: () => void;
  onQuoteIdChange: (quoteId: string) => void;
  onCustomerModeChange: (mode: CustomerSelectionMode) => void;
  onSelectCustomer: (customerId: string | null) => void;
  onCustomerFieldChange: (
    field: "customerName" | "customerEmail" | "customerPhone",
    value: string
  ) => void;
  onSaveDraftWithPdf: () => Promise<{ quoteId: string }>;
  onSendQuote: () => Promise<void>;
}

export function StepMaterials({
  materials,
  taxRate,
  quoteState,
  onMaterialsChange,
  onTaxRateChange,
  onReRecord,
  onQuoteIdChange,
  onCustomerModeChange,
  onSelectCustomer,
  onCustomerFieldChange,
  onSaveDraftWithPdf,
  onSendQuote,
}: StepMaterialsProps) {
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPostDownloadSheet, setShowPostDownloadSheet] = useState(false);

  const { subtotal, tax, grandTotal } = calculateQuoteTotals(
    materials,
    taxRate
  );

  function updateMaterial(id: string, field: keyof MaterialItem, value: string) {
    onMaterialsChange(
      materials.map((item) => {
        if (item.id !== id) return item;

        if (field === "quantity" || field === "unitPrice") {
          return { ...item, [field]: parseFloat(value) || 0 };
        }

        return { ...item, [field]: value };
      })
    );
  }

  function addRow() {
    onMaterialsChange([...materials, createMaterialItem()]);
  }

  function deleteRow(id: string) {
    onMaterialsChange(materials.filter((item) => item.id !== id));
  }

  async function handleSaveDraft() {
    setIsSavingDraft(true);
    setFeedback(null);

    try {
      const { quoteId } = await onSaveDraftWithPdf();
      onQuoteIdChange(quoteId);
      setFeedback({ message: "Saved to Drafts", type: "success" });
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : "Failed to save draft",
        type: "error",
      });
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleDownloadPdf() {
    setIsDownloading(true);
    setFeedback(null);

    try {
      const blob = await fetchQuotePdfBlob({
        materials,
        taxRate,
        projectName: quoteState.projectName,
        notes: quoteState.notes,
        validityDays: quoteState.validityDays,
        allowDraftPlaceholders: true,
      });

      downloadPdfBlob(blob);
      // Blob URLs stay in the browser only — email uses server-side PDF + confirm link.
      setShowPostDownloadSheet(true);
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : "Failed to generate PDF",
        type: "error",
      });
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSendFromPreview() {
    setIsSending(true);
    setFeedback(null);

    try {
      await onSendQuote();
      setFeedback({
        message: `Quote sent to ${quoteState.customerEmail}!`,
        type: "success",
      });
      setShowPreviewModal(false);
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : "Failed to send quote",
        type: "error",
      });
    } finally {
      setIsSending(false);
    }
  }

  function handleSendViaEmail() {
    setShowPostDownloadSheet(false);
    setShowPreviewModal(true);
  }

  function handleSendViaSms() {
    openSmsWithQuoteMessage(formatCurrency(grandTotal), quoteState.customerPhone);
    setShowPostDownloadSheet(false);
  }

  return (
    <div className="min-w-0">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">
        Review materials
      </h2>
      <p className="mt-2 text-base text-slate-400">
        Edit the AI-extracted line items, then save, download, or preview.
      </p>

      {feedback && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-base ${
            feedback.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Mobile card layout */}
      <div className="mt-6 space-y-4 md:hidden">
        {materials.map((item) => (
          <MaterialCard
            key={item.id}
            item={item}
            onUpdate={updateMaterial}
            onDelete={deleteRow}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 font-medium text-slate-300">Item</th>
              <th className="w-28 px-4 py-3 font-medium text-slate-300">Brand</th>
              <th className="w-24 px-4 py-3 font-medium text-slate-300">Qty</th>
              <th className="w-24 px-4 py-3 font-medium text-slate-300">Unit</th>
              <th className="w-32 px-4 py-3 font-medium text-slate-300">
                Unit Price ($)
              </th>
              <th className="w-28 px-4 py-3 font-medium text-slate-300">Total</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {materials.map((item) => (
              <tr key={item.id} className="border-b border-white/5">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.item}
                    onChange={(event) =>
                      updateMaterial(item.id, "item", event.target.value)
                    }
                    className="w-full min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1.5 text-base text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.brand}
                    onChange={(event) =>
                      updateMaterial(item.id, "brand", event.target.value)
                    }
                    className="w-full min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1.5 text-base text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) =>
                      updateMaterial(item.id, "quantity", event.target.value)
                    }
                    className="w-full min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1.5 text-base text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(event) =>
                      updateMaterial(item.id, "unit", event.target.value)
                    }
                    className="w-full min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1.5 text-base text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) =>
                      updateMaterial(item.id, "unitPrice", event.target.value)
                    }
                    className="w-full min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1.5 text-base text-white focus:border-accent focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2 text-base font-medium text-white">
                  {formatCurrency(materialLineTotal(item))}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => deleteRow(item.id)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-red-400 hover:text-red-300"
                    aria-label="Delete row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className={`${touchBtnSecondary} mt-4 w-full sm:w-auto`}
      >
        + Add row
      </button>

      <TotalsPanel
        subtotal={subtotal}
        tax={tax}
        grandTotal={grandTotal}
        taxRate={taxRate}
        onTaxRateChange={onTaxRateChange}
      />

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onReRecord}
          className={`${touchBtnSecondary} w-full`}
        >
          Re-record
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSavingDraft}
          className={`${touchBtnSecondary} w-full disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isSavingDraft ? "Saving..." : "Save to Draft"}
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className={`${touchBtnSecondary} w-full disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isDownloading ? "Generating PDF..." : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={() => setShowPreviewModal(true)}
          className={`${touchBtnPrimary} w-full`}
        >
          Preview Quote
        </button>
      </div>

      {showPreviewModal && (
        <MaterialsPreviewModal
          materials={materials}
          taxRate={taxRate}
          projectName={quoteState.projectName}
          notes={quoteState.notes}
          customerMode={quoteState.customerMode}
          selectedCustomerId={quoteState.selectedCustomerId}
          customerName={quoteState.customerName}
          customerEmail={quoteState.customerEmail}
          customerPhone={quoteState.customerPhone}
          onModeChange={onCustomerModeChange}
          onSelectCustomer={onSelectCustomer}
          onCustomerChange={onCustomerFieldChange}
          onSend={handleSendFromPreview}
          isSending={isSending}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {showPostDownloadSheet && (
        <PostDownloadSheet
          onSaveDraft={handleSaveDraft}
          onSendEmail={handleSendViaEmail}
          onSendSms={handleSendViaSms}
          onClose={() => setShowPostDownloadSheet(false)}
          isSavingDraft={isSavingDraft}
        />
      )}
    </div>
  );
}

function MaterialCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: MaterialItem;
  onUpdate: (id: string, field: keyof MaterialItem, value: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-2">
        <label className="flex-1 text-xs font-medium uppercase text-slate-500">
          Item
        </label>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-lg text-red-400"
          aria-label="Delete row"
        >
          ✕
        </button>
      </div>
      <input
        type="text"
        value={item.item}
        onChange={(event) => onUpdate(item.id, "item", event.target.value)}
        className={`${touchInput} mt-1`}
      />

      <div className="mt-3">
        <label className="text-xs font-medium uppercase text-slate-500">
          Brand
        </label>
        <input
          type="text"
          value={item.brand}
          onChange={(event) => onUpdate(item.id, "brand", event.target.value)}
          className={`${touchInput} mt-1`}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs font-medium uppercase text-slate-500">
            Qty
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.quantity}
            onChange={(event) =>
              onUpdate(item.id, "quantity", event.target.value)
            }
            className={`${touchInput} mt-1`}
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase text-slate-500">
            Unit
          </label>
          <input
            type="text"
            value={item.unit}
            onChange={(event) => onUpdate(item.id, "unit", event.target.value)}
            className={`${touchInput} mt-1`}
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase text-slate-500">
            Price
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.unitPrice}
            onChange={(event) =>
              onUpdate(item.id, "unitPrice", event.target.value)
            }
            className={`${touchInput} mt-1`}
          />
        </div>
      </div>

      <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-base">
        <span className="text-slate-400">Line total</span>
        <span className="font-semibold text-white">
          {formatCurrency(materialLineTotal(item))}
        </span>
      </div>
    </div>
  );
}

function TotalsPanel({
  subtotal,
  tax,
  grandTotal,
  taxRate,
  onTaxRateChange,
}: {
  subtotal: number;
  tax: number;
  grandTotal: number;
  taxRate: number;
  onTaxRateChange: (rate: number) => void;
}) {
  return (
    <div className="mt-8 w-full space-y-3 rounded-xl border border-white/10 bg-white/5 p-5 sm:ml-auto sm:max-w-xs">
      <div className="flex justify-between text-base">
        <span className="text-slate-400">Subtotal</span>
        <span className="font-medium text-white">{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between text-base">
        <span className="text-slate-400">Tax</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={taxRate}
            onChange={(event) =>
              onTaxRateChange(parseFloat(event.target.value) || 0)
            }
            className="w-16 min-h-[44px] rounded border border-white/10 bg-navy px-2 py-1 text-base text-right text-white focus:border-accent focus:outline-none"
          />
          <span className="text-slate-400">%</span>
          <span className="font-medium text-white">{formatCurrency(tax)}</span>
        </div>
      </div>
      <div className="flex justify-between border-t border-white/10 pt-3 text-lg">
        <span className="font-semibold text-white">Grand Total</span>
        <span className="font-bold text-accent">{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  );
}
