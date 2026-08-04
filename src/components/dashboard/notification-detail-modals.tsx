"use client";

import { MaterialOrderSummaryModal } from "@/components/dashboard/material-order-summary-modal";
import { NotificationSummaryModal } from "@/components/dashboard/notification-summary-modal";
import { SentQuotePreviewModal } from "@/components/quotes/sent-quote-preview-modal";
import { touchBtnSecondary } from "@/components/quotes/ui";
import type {
  MaterialSummaryView,
  NotificationModalKind,
} from "@/lib/notification-detail";
import type { AppNotification } from "@/types/notification";
import type { Quote } from "@/types/quote";

function LoadingDetailModal({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          {title}
        </p>
        <div className="mt-6 flex items-center gap-3 text-sm text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
          Loading details…
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`${touchBtnSecondary} w-full sm:w-auto`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationDetailModals({
  activeNotification,
  modalKind,
  previewQuote,
  materialSummary,
  isLoadingDetail,
  onClose,
}: {
  activeNotification: AppNotification | null;
  modalKind: NotificationModalKind | null;
  previewQuote: Quote | null;
  materialSummary: MaterialSummaryView | null;
  isLoadingDetail: boolean;
  onClose: () => void;
}) {
  if (!activeNotification || !modalKind) return null;

  if (modalKind === "quote") {
    if (isLoadingDetail) {
      return (
        <LoadingDetailModal title="Quote Summary" onClose={onClose} />
      );
    }
    if (previewQuote) {
      return (
        <SentQuotePreviewModal quote={previewQuote} onClose={onClose} />
      );
    }
    return (
      <NotificationSummaryModal
        notification={activeNotification}
        onClose={onClose}
      />
    );
  }

  if (modalKind === "material") {
    return (
      <MaterialOrderSummaryModal
        notification={activeNotification}
        summary={materialSummary}
        isLoading={isLoadingDetail}
        onClose={onClose}
      />
    );
  }

  return (
    <NotificationSummaryModal
      notification={activeNotification}
      onClose={onClose}
    />
  );
}
