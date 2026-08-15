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
  type TodayVoiceProjectCandidate,
} from "@/lib/today-voice-command";

export function VoiceCommandConfirmModal({
  transcript,
  command,
  targetTitle,
  dateKey,
  projects,
  selectedProjectId,
  keepAsPersonal,
  conflicts,
  acknowledgeConflicts,
  busy,
  canConfirm,
  onSelectProject,
  onKeepAsPersonal,
  onAcknowledgeConflicts,
  onCancel,
  onConfirm,
}: {
  transcript: string;
  command: TodayVoiceCommandResult;
  targetTitle: string | null;
  dateKey: string;
  projects: TodayVoiceProjectCandidate[];
  selectedProjectId: string | null;
  keepAsPersonal: boolean;
  conflicts: ScheduleConflictCandidate[];
  acknowledgeConflicts: boolean;
  busy: boolean;
  canConfirm: boolean;
  onSelectProject: (projectId: string) => void;
  onKeepAsPersonal: () => void;
  onAcknowledgeConflicts: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const resolvedProjectId = selectedProjectId || command.projectId;
  const projectName =
    projects.find((p) => p.id === resolvedProjectId)?.projectName ?? null;

  const summary = formatVoiceCommandSummary({
    intent: command.intent,
    targetTitle,
    title: command.title,
    date: command.date,
    time: command.time,
    dateKey,
    taskType: command.taskType,
    projectName: keepAsPersonal ? null : projectName,
  });

  const showingConflicts = conflicts.length > 0 && !acknowledgeConflicts;
  const intentLabel = intentHeading(command.intent);
  const showProjectClarify =
    command.intent === "add_item" &&
    command.needsProjectClarification &&
    !keepAsPersonal &&
    !resolvedProjectId;

  const projectChoices = rankProjectChoices(projects, command.projectQuery);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-glass bg-navy p-6 shadow-xl">
        {showingConflicts ? (
          <>
            <h2 className="text-xl font-semibold text-white">
              Schedule conflict
            </h2>
            <p className="mt-2 text-sm text-soft">
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
            <p className="mt-4 text-sm text-mute">{summary}</p>
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
            <p className="mt-2 text-sm text-mute">
              Heard:{" "}
              <span className="font-medium text-soft">
                “{transcript}”
              </span>
            </p>
            <div className="mt-4 emax-card px-3 py-3">
              <p className="text-sm font-medium text-white">{summary}</p>
              {command.notes ? (
                <p className="mt-1 text-xs text-mute">{command.notes}</p>
              ) : null}
              {command.clarification ? (
                <p className="mt-2 text-xs text-amber-200">
                  {command.clarification}
                </p>
              ) : null}
              {keepAsPersonal ? (
                <p className="mt-2 text-xs text-mute">
                  Will save as a personal item (no project link).
                </p>
              ) : null}
              {!canConfirm && !showProjectClarify ? (
                <p className="mt-2 text-xs text-red-300">
                  I need a clearer match before running this. Try naming the
                  item and time.
                </p>
              ) : null}
            </div>

            {showProjectClarify ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-soft">
                  Link to a project
                  {command.projectQuery
                    ? ` (heard “${command.projectQuery}”)`
                    : ""}
                </p>
                {projectChoices.length === 0 ? (
                  <p className="mt-2 text-xs text-mute">
                    No active projects found. Keep as personal or cancel.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                    {projectChoices.map((project) => (
                      <li key={project.id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onSelectProject(project.id)}
                          className="flex w-full flex-col emax-card px-3 py-2.5 text-left transition hover:border-accent/40 hover:bg-accent/10"
                        >
                          <span className="text-sm font-semibold text-white">
                            {project.projectName}
                          </span>
                          {project.customerName ? (
                            <span className="text-xs text-mute">
                              {project.customerName}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={onKeepAsPersonal}
                  className="mt-3 text-xs font-semibold text-mute underline-offset-2 hover:text-soft hover:underline"
                >
                  Keep as personal instead
                </button>
              </div>
            ) : null}

            {command.intent === "add_item" &&
            resolvedProjectId &&
            !keepAsPersonal ? (
              <p className="mt-3 text-xs text-emerald-300">
                Linked to{" "}
                {projectName || "selected project"}
                {selectedProjectId ? " (your pick)" : ""}.
              </p>
            ) : null}

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
    case "add_item":
      return "Confirm new task";
    default:
      return "Didn't catch that";
  }
}

function rankProjectChoices(
  projects: TodayVoiceProjectCandidate[],
  query: string | null
): TodayVoiceProjectCandidate[] {
  if (!query?.trim()) return projects.slice(0, 12);
  const q = query.trim().toLowerCase();
  const scored = projects
    .map((p) => {
      const name = p.projectName.toLowerCase();
      const customer = (p.customerName || "").toLowerCase();
      let score = 0;
      if (name === q) score = 100;
      else if (name.includes(q) || q.includes(name)) score = 80;
      else if (customer && (customer.includes(q) || q.includes(customer)))
        score = 50;
      else {
        const tokens = q.split(/\s+/).filter(Boolean);
        const hits = tokens.filter(
          (t) => name.includes(t) || customer.includes(t)
        ).length;
        score = hits * 20;
      }
      return { p, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.p);

  return (scored.length ? scored : projects).slice(0, 12);
}
