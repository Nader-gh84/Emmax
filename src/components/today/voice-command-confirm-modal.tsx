"use client";

import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import type { ScheduleConflictCandidate } from "@/lib/schedule-conflicts";
import { formatConflictTime } from "@/lib/schedule-conflicts";
import {
  formatVoiceCommandSummary,
  type TodayVoiceCommandResult,
  type TodayVoiceIntent,
} from "@/lib/today-voice-command";

export function VoiceCommandConfirmModal({
  transcript,
  command,
  targetTitle,
  dateKey,
  conflicts,
  acknowledgeConflicts,
  busy,
  canConfirm,
  onAcknowledgeConflicts,
  onCancel,
  onConfirm,
}: {
  transcript: string;
  command: TodayVoiceCommandResult;
  targetTitle: string | null;
  dateKey: string;
  conflicts: ScheduleConflictCandidate[];
  acknowledgeConflicts: boolean;
  busy: boolean;
  canConfirm: boolean;
  onAcknowledgeConflicts: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const summary = formatVoiceCommandSummary({
    intent: command.intent,
    targetTitle,
    title: command.title,
    date: command.date,
    time: command.time,
    dateKey,
  });

  const showingConflicts = conflicts.length > 0 && !acknowledgeConflicts;
  const intentLabel = intentHeading(command.intent);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        {showingConflicts ? (
          <>
            <h2 className="text-xl font-semibold text-white">
              Schedule conflict
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              That time is close to something else. You can still proceed.
            </p>
            <ul className="mt-4 space-y-2">
              {conflicts.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-50"
                >
                  <span className="font-semibold">
                    {formatConflictTime(item.scheduled_start)}
                  </span>
                  {" — "}
                  {item.title}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-400">{summary}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={onCancel}
                className={`${touchBtnSecondary} w-full sm:w-auto`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onAcknowledgeConflicts}
                className={`${touchBtnPrimary} w-full sm:w-auto`}
              >
                Schedule anyway
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white">{intentLabel}</h2>
            <p className="mt-2 text-sm text-slate-400">
              Heard:{" "}
              <span className="font-medium text-slate-200">
                “{transcript}”
              </span>
            </p>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <p className="text-sm font-medium text-white">{summary}</p>
              {command.notes ? (
                <p className="mt-1 text-xs text-slate-400">{command.notes}</p>
              ) : null}
              {command.clarification ? (
                <p className="mt-2 text-xs text-amber-200">
                  {command.clarification}
                </p>
              ) : null}
              {!canConfirm ? (
                <p className="mt-2 text-xs text-red-300">
                  I need a clearer match before running this. Try naming the
                  item and time.
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={onCancel}
                className={`${touchBtnSecondary} w-full sm:w-auto`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !canConfirm}
                onClick={onConfirm}
                className={`${touchBtnPrimary} w-full sm:w-auto`}
              >
                {busy ? "Working…" : "Confirm"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function intentHeading(intent: TodayVoiceIntent): string {
  switch (intent) {
    case "mark_done":
      return "Confirm mark done";
    case "reschedule":
      return "Confirm reschedule";
    case "add_personal":
      return "Confirm new task";
    default:
      return "Didn't catch that";
  }
}
