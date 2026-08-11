"use client";

import { useEffect, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchTextarea,
} from "@/components/quotes/ui";
import { IconMicrophone } from "@/components/dashboard/icons";

export function QuickAddLadderModal({
  open,
  busy,
  onClose,
  onChooseVoice,
  onParseText,
  onChooseFullForm,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onChooseVoice: () => void;
  onParseText: (text: string) => Promise<void>;
  onChooseFullForm: () => void;
}) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<"ladder" | "text">("ladder");

  useEffect(() => {
    if (!open) {
      setText("");
      setStep("ladder");
    }
  }, [open]);

  if (!open) return null;

  async function handleParse(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    await onParseText(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-navy p-5 shadow-xl sm:p-6">
        {step === "ladder" ? (
          <>
            <h2 className="text-xl font-semibold text-white">Quick Add</h2>
            <p className="mt-1 text-sm text-slate-400">
              Fastest first — voice, quick text, or the full form.
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={onChooseVoice}
                className="flex w-full items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3.5 text-left transition hover:bg-accent/20 disabled:opacity-50"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
                  <IconMicrophone className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">
                    Voice
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    Hold the mic and say what to add or change
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => setStep("text")}
                className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:opacity-50"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-slate-200">
                  Aa
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">
                    Quick text
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    Type a note — AI parses time, type, and project
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={onChooseFullForm}
                className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:opacity-50"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-slate-200">
                  ≡
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">
                    Full form
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    Title, type, project, priority, date & time
                  </span>
                </span>
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className={touchBtnSecondary}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white">Quick text</h2>
            <p className="mt-1 text-sm text-slate-400">
              Example: “Site visit for Kitchen remodel tomorrow at 2pm”
            </p>
            <form onSubmit={(e) => void handleParse(e)} className="mt-4 space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`${touchTextarea} min-h-[100px]`}
                placeholder="What should I add?"
                autoFocus
                disabled={busy}
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep("ladder")}
                  className={touchBtnSecondary}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={busy || !text.trim()}
                  className={touchBtnPrimary}
                >
                  {busy ? "Parsing…" : "Parse & confirm"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
