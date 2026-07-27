"use client";

import { touchBtnPrimary, touchBtnSecondary } from "@/components/quotes/ui";
import { isSmsSupported } from "@/lib/quote-pdf-client";

interface PostDownloadSheetProps {
  onSaveDraft: () => void | Promise<void>;
  onSendEmail: () => void;
  onSendSms: () => void;
  onClose: () => void;
  isSavingDraft?: boolean;
}

export function PostDownloadSheet({
  onSaveDraft,
  onSendEmail,
  onSendSms,
  onClose,
  isSavingDraft = false,
}: PostDownloadSheetProps) {
  const smsSupported = isSmsSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-white/10 bg-navy p-6 shadow-xl sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-white">What&apos;s next?</h2>
        <p className="mt-1 text-sm text-slate-400">
          Your PDF download has started.
        </p>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSavingDraft}
            className={`${touchBtnPrimary} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isSavingDraft ? "Saving..." : "Save to Draft"}
          </button>
          <button
            type="button"
            onClick={onSendEmail}
            className={`${touchBtnSecondary} w-full`}
          >
            Send via Email
          </button>
          {smsSupported && (
            <button
              type="button"
              onClick={onSendSms}
              className={`${touchBtnSecondary} w-full`}
            >
              Send via SMS
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-slate-400 transition hover:text-white"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
