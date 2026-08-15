"use client";

import { useEffect, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import type { AlertScheduleDraft } from "@/lib/today-alert-actions";

export function AlertRescheduleModal({
  draft,
  open,
  busy,
  onClose,
  onConfirm,
}: {
  draft: AlertScheduleDraft | null;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (next: { dateKey: string; timeHm: string }) => void;
}) {
  const [dateKey, setDateKey] = useState("");
  const [timeHm, setTimeHm] = useState("");

  useEffect(() => {
    if (!open || !draft) return;
    setDateKey(draft.dateKey);
    setTimeHm(draft.timeHm);
  }, [open, draft]);

  if (!open || !draft) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-reschedule-title"
        className="w-full max-w-md rounded-2xl border border-glass bg-navy p-5 shadow-xl"
      >
        <h2
          id="alert-reschedule-title"
          className="text-lg font-semibold text-white"
        >
          Reschedule onto Today
        </h2>
        <p className="mt-1 text-sm text-mute line-clamp-2">{draft.title}</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mute">
              Date
            </span>
            <input
              type="date"
              className={touchInput}
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mute">
              Time
            </span>
            <input
              type="time"
              className={touchInput}
              value={timeHm}
              onChange={(e) => setTimeHm(e.target.value)}
              disabled={busy}
            />
            <span className="mt-1 block text-xs text-mute">
              Leave empty for all-day.
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={touchBtnSecondary}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={touchBtnPrimary}
            disabled={busy || !dateKey}
            onClick={() => onConfirm({ dateKey, timeHm })}
          >
            {busy ? "Saving…" : "Add to schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
