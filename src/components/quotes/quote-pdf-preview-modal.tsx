"use client";

import { useEffect, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import { downloadPdfBlob } from "@/lib/quote-pdf-client";
import {
  createQuotePdfSignedUrl,
  downloadQuotePdfBlob,
} from "@/lib/quote-pdf-storage";

export function QuotePdfPreviewModal({
  title,
  quoteNumber,
  pdfPath,
  pdfFileName,
  busy,
  onClose,
  onSendToCustomer,
  onSaveToDraft,
}: {
  title: string;
  quoteNumber?: string | null;
  pdfPath: string;
  pdfFileName?: string;
  busy?: boolean;
  onClose: () => void;
  onSendToCustomer: () => void;
  onSaveToDraft: () => void | Promise<void>;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setIsLoadingPreview(true);
      setError(null);
      setSignedUrl(null);
      try {
        const url = await createQuotePdfSignedUrl(pdfPath);
        if (!cancelled) setSignedUrl(url);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load PDF preview"
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [pdfPath]);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      const blob = await downloadQuotePdfBlob(pdfPath);
      downloadPdfBlob(
        blob,
        pdfFileName || `${quoteNumber || "quote"}.pdf`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to download PDF"
      );
    } finally {
      setIsDownloading(false);
    }
  }

  const actionsDisabled = Boolean(busy) || isDownloading || isLoadingPreview;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Quote PDF
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold text-white">
              {title}
            </h2>
            {quoteNumber ? (
              <p className="mt-1 text-sm text-slate-400">{quoteNumber}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {isLoadingPreview ? (
            <div className="flex min-h-[320px] items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
              Loading PDF preview…
            </div>
          ) : signedUrl ? (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
              <iframe
                title="Quote PDF preview"
                src={signedUrl}
                className="h-[55vh] w-full min-h-[320px] sm:h-[60vh]"
              />
            </div>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-sm text-red-300">
              {error || "PDF preview unavailable."}
            </div>
          )}

          {error && signedUrl ? (
            <p className="mt-3 text-sm text-red-300">{error}</p>
          ) : null}
        </div>

        <div className="shrink-0 space-y-3 border-t border-white/10 px-5 py-4 sm:px-6">
          <p className="text-xs text-slate-500 sm:text-sm">
            Preview uses a temporary signed link to your private quote PDF.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={onSendToCustomer}
              className={`${touchBtnPrimary} flex-1 sm:min-w-[10rem]`}
            >
              Send to Customer
            </button>
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={() => void onSaveToDraft()}
              className={`${touchBtnSecondary} flex-1 sm:min-w-[10rem]`}
            >
              Save to Draft
            </button>
            <button
              type="button"
              disabled={actionsDisabled || !signedUrl}
              onClick={() => void handleDownload()}
              className={`${touchBtnSecondary} flex-1 sm:min-w-[10rem]`}
            >
              {isDownloading ? "Downloading…" : "Download PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
