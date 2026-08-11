"use client";

import { useEffect, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import {
  findScheduleConflicts,
  formatConflictTime,
  type ScheduleConflictCandidate,
} from "@/lib/schedule-conflicts";
import type { TodayVoiceProjectCandidate } from "@/lib/today-voice-command";
import {
  agendaPriorityLabel,
  isAgendaPriority,
  scheduleTaskTypeLabel,
  type AgendaPriority,
  type ScheduleItem,
  type ScheduleTaskType,
} from "@/types/schedule-item";

const MANUAL_TYPES: ScheduleTaskType[] = [
  "personal",
  "site_visit",
  "call",
  "inspection",
  "pickup",
  "delivery",
  "other",
];

const PRIORITIES: AgendaPriority[] = ["high", "medium", "low"];

export type ScheduleItemFormValues = {
  title: string;
  task_type: ScheduleTaskType;
  date: string;
  time: string; // HH:MM or "" for all-day
  notes: string;
  priority: AgendaPriority;
  project_id: string;
};

export function emptyScheduleItemForm(dateKey: string): ScheduleItemFormValues {
  return {
    title: "",
    task_type: "personal",
    date: dateKey,
    time: "",
    notes: "",
    priority: "medium",
    project_id: "",
  };
}

export function scheduleItemToForm(item: ScheduleItem): ScheduleItemFormValues {
  let date = new Date().toISOString().slice(0, 10);
  let time = "";
  if (item.scheduled_start) {
    const start = new Date(item.scheduled_start);
    if (!Number.isNaN(start.getTime())) {
      date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      if (!item.all_day) {
        time = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
      }
    }
  }
  return {
    title: item.title,
    task_type: item.task_type,
    date,
    time: item.all_day ? "" : time,
    notes: item.notes ?? "",
    priority: isAgendaPriority(String(item.priority ?? ""))
      ? (item.priority as AgendaPriority)
      : "medium",
    project_id: item.project_id ?? "",
  };
}

/** Build ISO timestamptz from local date + optional HH:MM. */
export function formValuesToSchedulePayload(form: ScheduleItemFormValues): {
  title: string;
  task_type: ScheduleTaskType;
  notes: string | null;
  all_day: boolean;
  scheduled_start: string | null;
  scheduled_end: string | null;
  priority: AgendaPriority;
  project_id: string | null;
} {
  const title = form.title.trim();
  const notes = form.notes.trim() || null;
  const allDay = !form.time.trim();
  const priority = form.priority;
  const project_id = form.project_id.trim() || null;

  if (allDay) {
    const [y, m, d] = form.date.split("-").map(Number);
    const start = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
    return {
      title,
      task_type: form.task_type,
      notes,
      all_day: true,
      scheduled_start: start.toISOString(),
      scheduled_end: null,
      priority,
      project_id,
    };
  }

  const [y, m, d] = form.date.split("-").map(Number);
  const [hh, mm] = form.time.split(":").map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  return {
    title,
    task_type: form.task_type,
    notes,
    all_day: false,
    scheduled_start: start.toISOString(),
    scheduled_end: null,
    priority,
    project_id,
  };
}

export function ScheduleItemFormModal({
  title,
  initialForm,
  isSaving,
  existingItems,
  projects = [],
  excludeId = null,
  onClose,
  onSubmit,
}: {
  title: string;
  initialForm: ScheduleItemFormValues;
  isSaving: boolean;
  existingItems: ScheduleConflictCandidate[];
  projects?: TodayVoiceProjectCandidate[];
  excludeId?: string | null;
  onClose: () => void;
  onSubmit: (form: ScheduleItemFormValues) => Promise<void>;
}) {
  const [form, setForm] = useState<ScheduleItemFormValues>(initialForm);
  const [conflicts, setConflicts] = useState<ScheduleConflictCandidate[] | null>(
    null
  );

  useEffect(() => {
    setForm(initialForm);
    setConflicts(null);
  }, [initialForm]);

  function updateField<K extends keyof ScheduleItemFormValues>(
    key: K,
    value: ScheduleItemFormValues[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    // Changing schedule inputs invalidates a prior soft-conflict confirmation.
    if (key === "date" || key === "time") {
      setConflicts(null);
    }
  }

  async function proceedSubmit() {
    await onSubmit(form);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.date) return;

    const payload = formValuesToSchedulePayload(form);
    if (!payload.all_day && payload.scheduled_start) {
      const found = findScheduleConflicts({
        proposedStart: payload.scheduled_start,
        proposedEnd: payload.scheduled_end,
        existing: existingItems,
        excludeId,
      });
      if (found.length > 0) {
        setConflicts(found);
        return;
      }
    }

    await proceedSubmit();
  }

  const showingConflict = conflicts !== null && conflicts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!isSaving) onClose();
        }}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        {showingConflict ? (
          <>
            <h2 className="text-xl font-semibold text-white">
              Schedule conflict
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              You already have something nearby. You can still schedule this —
              just confirming you meant to.
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
            <p className="mt-4 text-sm text-slate-400">
              New item:{" "}
              <span className="font-medium text-slate-200">
                {form.time
                  ? `${form.time} — ${form.title.trim() || "Untitled"}`
                  : form.title.trim() || "Untitled"}
              </span>
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setConflicts(null)}
                className={`${touchBtnSecondary} w-full sm:w-auto`}
              >
                Pick another time
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void proceedSubmit()}
                className={`${touchBtnPrimary} w-full sm:w-auto`}
              >
                {isSaving ? "Saving…" : "Schedule anyway"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="schedule-title"
                  className="block text-base font-medium text-slate-300"
                >
                  Title <span className="text-accent">*</span>
                </label>
                <input
                  id="schedule-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className={`${touchInput} mt-1.5`}
                  placeholder="e.g. Site visit — Kaila project"
                  required
                  autoFocus
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="schedule-type"
                    className="block text-base font-medium text-slate-300"
                  >
                    Type
                  </label>
                  <select
                    id="schedule-type"
                    value={form.task_type}
                    onChange={(e) =>
                      updateField("task_type", e.target.value as ScheduleTaskType)
                    }
                    className={`${touchInput} mt-1.5 appearance-none`}
                  >
                    {MANUAL_TYPES.map((type) => (
                      <option key={type} value={type} className="bg-navy">
                        {scheduleTaskTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="schedule-priority"
                    className="block text-base font-medium text-slate-300"
                  >
                    Priority
                  </label>
                  <select
                    id="schedule-priority"
                    value={form.priority}
                    onChange={(e) =>
                      updateField(
                        "priority",
                        e.target.value as AgendaPriority
                      )
                    }
                    className={`${touchInput} mt-1.5 appearance-none`}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority} className="bg-navy">
                        {agendaPriorityLabel(priority)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="schedule-project"
                  className="block text-base font-medium text-slate-300"
                >
                  Project
                </label>
                <select
                  id="schedule-project"
                  value={form.project_id}
                  onChange={(e) => updateField("project_id", e.target.value)}
                  className={`${touchInput} mt-1.5 appearance-none`}
                >
                  <option value="" className="bg-navy">
                    None (personal / unlinked)
                  </option>
                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                      className="bg-navy"
                    >
                      {project.projectName}
                      {project.customerName
                        ? ` — ${project.customerName}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="schedule-date"
                    className="block text-base font-medium text-slate-300"
                  >
                    Date <span className="text-accent">*</span>
                  </label>
                  <input
                    id="schedule-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField("date", e.target.value)}
                    className={`${touchInput} mt-1.5`}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="schedule-time"
                    className="block text-base font-medium text-slate-300"
                  >
                    Time
                  </label>
                  <input
                    id="schedule-time"
                    type="time"
                    value={form.time}
                    onChange={(e) => updateField("time", e.target.value)}
                    className={`${touchInput} mt-1.5`}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Leave blank for all-day.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="schedule-notes"
                  className="block text-base font-medium text-slate-300"
                >
                  Notes
                </label>
                <textarea
                  id="schedule-notes"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className={`${touchTextarea} mt-1.5 min-h-[80px]`}
                  placeholder="Optional"
                />
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={onClose}
                  className={`${touchBtnSecondary} w-full sm:w-auto`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !form.title.trim()}
                  className={`${touchBtnPrimary} w-full sm:w-auto`}
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
