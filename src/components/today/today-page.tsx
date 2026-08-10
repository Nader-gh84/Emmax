"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  IconBell,
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconMicrophone,
  IconTruck,
} from "@/components/dashboard/icons";
import {
  ScheduleItemFormModal,
  emptyScheduleItemForm,
  formValuesToSchedulePayload,
  scheduleItemToForm,
  type ScheduleItemFormValues,
} from "@/components/today/schedule-item-form-modal";
import { VoiceCommandConfirmModal } from "@/components/today/voice-command-confirm-modal";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import { useTtsPlayback } from "@/hooks/use-tts-playback";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import {
  findScheduleConflicts,
  type ScheduleConflictCandidate,
} from "@/lib/schedule-conflicts";
import { createClient } from "@/lib/supabase";
import {
  formatAgendaMoney,
  formatAgendaTime,
  resolveTodayAlertHref,
  type TodayAgendaItem,
  type TodayAgendaViewModel,
} from "@/lib/today-agenda";
import {
  toVoiceAgendaCandidates,
  type TodayVoiceCommandResult,
} from "@/lib/today-voice-command";
import { formatNotificationTime } from "@/types/notification";
import {
  scheduleTaskTypeLabel,
  type ScheduleItem,
  type ScheduleTaskType,
} from "@/types/schedule-item";

type VoicePhase =
  | "idle"
  | "transcribing"
  | "classifying"
  | "confirm"
  | "executing";

const BRIEF_TTS_INSTRUCTIONS =
  "Speak like a calm, clear executive assistant delivering a morning briefing. Warm but efficient, natural pacing with short pauses between sentences. No theatrical flourish.";

type TaskFilter = "all" | ScheduleTaskType;

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "project_task", label: "Projects" },
  { id: "pickup", label: "Pickup" },
  { id: "delivery", label: "Delivery" },
  { id: "site_visit", label: "Site visit" },
  { id: "call", label: "Calls" },
  { id: "payment_reminder", label: "Payments" },
  { id: "personal", label: "Personal" },
];

const SUGGESTED_PHRASES = [
  "Mark the site visit as done",
  "Reschedule pickup to 3 PM",
  "Add a personal task for dinner at 7",
];

function typeAccent(type: ScheduleTaskType): string {
  switch (type) {
    case "pickup":
    case "delivery":
      return "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30";
    case "site_visit":
    case "inspection":
      return "bg-violet-500/15 text-violet-300 ring-violet-500/30";
    case "call":
      return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    case "payment_reminder":
      return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
    case "personal":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "project_task":
      return "bg-accent/15 text-accent ring-accent/30";
    default:
      return "bg-white/10 text-slate-300 ring-white/15";
  }
}

function statusLabel(status: TodayAgendaItem["status"]): string {
  switch (status) {
    case "completed":
      return "Done";
    case "overdue":
      return "Overdue";
    case "in_progress":
      return "In progress";
    case "cancelled":
      return "Cancelled";
    default:
      return "Open";
  }
}

function sourceIdFromAgenda(item: TodayAgendaItem): string | null {
  const colon = item.id.indexOf(":");
  if (colon < 0) return null;
  return item.id.slice(colon + 1) || null;
}

export function TodayPage({
  agenda,
  scheduleItems,
  userId,
}: {
  agenda: TodayAgendaViewModel;
  scheduleItems: ScheduleItem[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const briefTts = useTtsPlayback();

  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceCommand, setVoiceCommand] =
    useState<TodayVoiceCommandResult | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [acknowledgeConflicts, setAcknowledgeConflicts] = useState(false);
  const [conflictGate, setConflictGate] = useState(false);

  const briefScript = useMemo(
    () => agenda.briefLines.join(" "),
    [agenda.briefLines]
  );

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      setVoiceError(null);
      setVoicePhase("transcribing");

      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("extract", "false");

        const transcriptResponse = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        const transcriptData = (await transcriptResponse.json()) as {
          transcript?: string;
          error?: string;
        };
        if (!transcriptResponse.ok) {
          throw new Error(transcriptData.error || "Transcription failed");
        }

        const transcript = transcriptData.transcript?.trim() ?? "";
        if (!transcript) {
          throw new Error("I didn't catch that — try holding the mic again.");
        }
        setVoiceTranscript(transcript);
        setVoicePhase("classifying");

        const classifyResponse = await fetch("/api/today-voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            dateKey: agenda.dateKey,
            candidates: toVoiceAgendaCandidates(agenda.items),
          }),
        });
        const classifyData = (await classifyResponse.json()) as {
          command?: TodayVoiceCommandResult;
          error?: string;
        };
        if (!classifyResponse.ok || !classifyData.command) {
          throw new Error(
            classifyData.error || "Could not understand that command"
          );
        }

        setVoiceCommand(classifyData.command);
        setAcknowledgeConflicts(false);
        setConflictGate(false);
        setVoicePhase("confirm");
      } catch (err) {
        setVoicePhase("idle");
        setVoiceCommand(null);
        setVoiceError(
          err instanceof Error ? err.message : "Voice command failed"
        );
      }
    },
    [agenda.dateKey, agenda.items]
  );

  const {
    status: recorderStatus,
    error: recorderError,
    seconds: recorderSeconds,
    startRecording,
    stopRecording,
  } = useVoiceRecorder({
    onRecordingComplete: handleRecordingComplete,
    silenceDurationMs: 5000,
  });

  const isRecording = recorderStatus === "recording";
  const voiceBusy =
    isRecording ||
    voicePhase === "transcribing" ||
    voicePhase === "classifying" ||
    voicePhase === "executing";

  async function handleStartBrief() {
    if (briefTts.isPlaying || briefTts.isLoading) {
      briefTts.stop();
      return;
    }
    await briefTts.play(briefScript, { instructions: BRIEF_TTS_INSTRUCTIONS });
  }

  async function handleMicPointerDown(
    event: React.PointerEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    if (briefTts.isPlaying || briefTts.isLoading) {
      briefTts.stop();
    }
    if (voicePhase === "confirm" || voiceBusy) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may fail on some browsers; hold-to-talk still works.
    }
    setVoiceError(null);
    await startRecording();
  }

  async function handleMicPointerUp() {
    if (isRecording) {
      await stopRecording();
    }
  }

  function briefButtonLabel() {
    if (briefTts.isLoading) return "Generating…";
    if (briefTts.isPlaying) return "Stop Brief";
    if (briefTts.status === "ended" || briefTts.status === "error") {
      return "Replay Brief";
    }
    return "Start Brief";
  }

  function voiceStatusLabel() {
    if (isRecording) return `Listening… ${recorderSeconds}s`;
    if (voicePhase === "transcribing") return "Transcribing…";
    if (voicePhase === "classifying") return "Understanding…";
    if (voicePhase === "executing") return "Updating agenda…";
    if (voicePhase === "confirm") return "Confirm the command below";
    return "Hold mic to talk";
  }

  const filteredItems = useMemo(() => {
    if (filter === "all") return agenda.items;
    if (filter === "pickup") {
      return agenda.items.filter(
        (item) => item.taskType === "pickup" || item.taskType === "delivery"
      );
    }
    return agenda.items.filter((item) => item.taskType === filter);
  }, [agenda.items, filter]);

  const dateLabel = useMemo(() => {
    const date = new Date(`${agenda.dateKey}T12:00:00`);
    return date.toLocaleDateString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [agenda.dateKey]);

  const conflictCandidates = useMemo(
    () =>
      scheduleItems.filter(
        (item) => item.status !== "completed" && item.status !== "cancelled"
      ),
    [scheduleItems]
  );

  const initialForm = useMemo(
    () =>
      editing
        ? scheduleItemToForm(editing)
        : emptyScheduleItemForm(agenda.dateKey),
    [editing, agenda.dateKey]
  );

  function openCreate() {
    setEditing(null);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(item: TodayAgendaItem) {
    if (item.kind !== "schedule") return;
    const id = sourceIdFromAgenda(item);
    if (!id) return;
    const row = scheduleItems.find((s) => s.id === id) ?? null;
    if (!row) return;
    setEditing(row);
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setFormOpen(false);
    setEditing(null);
  }

  async function saveScheduleItem(form: ScheduleItemFormValues) {
    if (!userId) {
      setError("Sign in required to save schedule items.");
      throw new Error("missing user");
    }
    setIsSaving(true);
    setError(null);
    const payload = formValuesToSchedulePayload(form);

    const { error: saveError } = editing
      ? await supabase
          .from("schedule_items")
          .update({
            task_type: payload.task_type,
            title: payload.title,
            notes: payload.notes,
            scheduled_start: payload.scheduled_start,
            scheduled_end: payload.scheduled_end,
            all_day: payload.all_day,
          })
          .eq("id", editing.id)
      : await supabase.from("schedule_items").insert({
          user_id: userId,
          task_type: payload.task_type,
          title: payload.title,
          notes: payload.notes,
          status: "todo",
          scheduled_start: payload.scheduled_start,
          scheduled_end: payload.scheduled_end,
          all_day: payload.all_day,
          source: "manual",
        });

    setIsSaving(false);
    if (saveError) {
      setError(saveError.message);
      throw saveError;
    }

    setFormOpen(false);
    setEditing(null);
    startTransition(() => router.refresh());
  }

  async function toggleComplete(item: TodayAgendaItem) {
    const id = sourceIdFromAgenda(item);
    if (!id) return;
    if (item.kind !== "schedule" && item.kind !== "project_task") return;

    setBusyId(item.id);
    setError(null);
    const nextCompleted = item.status !== "completed";
    const nextStatus = nextCompleted ? "completed" : "todo";
    const completedAt = nextCompleted ? new Date().toISOString() : null;

    if (item.kind === "schedule") {
      const { error: updateError } = await supabase
        .from("schedule_items")
        .update({ status: nextStatus, completed_at: completedAt })
        .eq("id", id);
      if (updateError) setError(updateError.message);
    } else {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: nextStatus, completed_at: completedAt })
        .eq("id", id);
      if (updateError) setError(updateError.message);
    }

    setBusyId(null);
    startTransition(() => router.refresh());
  }

  async function deleteScheduleItem(item: TodayAgendaItem) {
    if (item.kind !== "schedule") return;
    const id = sourceIdFromAgenda(item);
    if (!id) return;
    if (!window.confirm(`Delete “${item.title}”?`)) return;

    setBusyId(item.id);
    setError(null);
    const { error: deleteError } = await supabase
      .from("schedule_items")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  const voiceTargetItem = useMemo(() => {
    if (!voiceCommand?.targetAgendaId) return null;
    return (
      agenda.items.find((item) => item.id === voiceCommand.targetAgendaId) ??
      null
    );
  }, [agenda.items, voiceCommand]);

  const voiceCanConfirm = useMemo(() => {
    if (!voiceCommand) return false;
    if (voiceCommand.intent === "unknown") return false;
    if (voiceCommand.confidence > 0 && voiceCommand.confidence < 0.45) {
      return false;
    }
    if (voiceCommand.intent === "mark_done") {
      return Boolean(
        voiceTargetItem &&
          (voiceTargetItem.kind === "schedule" ||
            voiceTargetItem.kind === "project_task")
      );
    }
    if (voiceCommand.intent === "reschedule") {
      return Boolean(
        voiceTargetItem?.kind === "schedule" &&
          (voiceCommand.date || agenda.dateKey)
      );
    }
    if (voiceCommand.intent === "add_personal") {
      return Boolean(voiceCommand.title?.trim());
    }
    return false;
  }, [agenda.dateKey, voiceCommand, voiceTargetItem]);

  const voiceConflicts = useMemo((): ScheduleConflictCandidate[] => {
    if (!voiceCommand) return [];
    if (
      voiceCommand.intent !== "reschedule" &&
      voiceCommand.intent !== "add_personal"
    ) {
      return [];
    }
    if (!voiceCommand.time) return [];

    const form: ScheduleItemFormValues = {
      title:
        voiceCommand.intent === "add_personal"
          ? voiceCommand.title || "Personal task"
          : voiceTargetItem?.title || "Scheduled item",
      task_type:
        voiceCommand.intent === "add_personal"
          ? "personal"
          : voiceTargetItem?.taskType || "other",
      date: voiceCommand.date || agenda.dateKey,
      time: voiceCommand.time,
      notes: voiceCommand.notes || "",
    };
    const payload = formValuesToSchedulePayload(form);
    if (!payload.scheduled_start || payload.all_day) return [];

    const excludeId =
      voiceCommand.intent === "reschedule" && voiceTargetItem
        ? sourceIdFromAgenda(voiceTargetItem)
        : null;

    return findScheduleConflicts({
      proposedStart: payload.scheduled_start,
      proposedEnd: payload.scheduled_end,
      existing: conflictCandidates,
      excludeId,
    });
  }, [
    agenda.dateKey,
    conflictCandidates,
    voiceCommand,
    voiceTargetItem,
  ]);

  function closeVoiceConfirm() {
    if (voicePhase === "executing") return;
    setVoicePhase("idle");
    setVoiceCommand(null);
    setAcknowledgeConflicts(false);
    setConflictGate(false);
  }

  async function executeVoiceCommand() {
    if (!voiceCommand || !userId) return;
    setVoicePhase("executing");
    setVoiceError(null);
    setError(null);

    try {
      if (voiceCommand.intent === "mark_done") {
        if (!voiceTargetItem) throw new Error("No matching agenda item.");
        const id = sourceIdFromAgenda(voiceTargetItem);
        if (!id) throw new Error("Missing agenda item id.");
        if (voiceTargetItem.status !== "completed") {
          const completedAt = new Date().toISOString();
          if (voiceTargetItem.kind === "schedule") {
            const { error: updateError } = await supabase
              .from("schedule_items")
              .update({ status: "completed", completed_at: completedAt })
              .eq("id", id);
            if (updateError) throw new Error(updateError.message);
          } else if (voiceTargetItem.kind === "project_task") {
            const { error: updateError } = await supabase
              .from("tasks")
              .update({ status: "completed", completed_at: completedAt })
              .eq("id", id);
            if (updateError) throw new Error(updateError.message);
          } else {
            throw new Error("That item can't be marked done by voice.");
          }
        }
        startTransition(() => router.refresh());
      } else if (voiceCommand.intent === "reschedule") {
        if (!voiceTargetItem || voiceTargetItem.kind !== "schedule") {
          throw new Error("I can only reschedule schedule items by voice.");
        }
        const id = sourceIdFromAgenda(voiceTargetItem);
        if (!id) throw new Error("Missing schedule item id.");
        const row = scheduleItems.find((item) => item.id === id);
        if (!row) throw new Error("Schedule item not found.");

        const form: ScheduleItemFormValues = {
          title: row.title,
          task_type: row.task_type,
          date: voiceCommand.date || agenda.dateKey,
          time: voiceCommand.time || "",
          notes: voiceCommand.notes ?? row.notes ?? "",
        };
        const payload = formValuesToSchedulePayload(form);
        const { error: updateError } = await supabase
          .from("schedule_items")
          .update({
            scheduled_start: payload.scheduled_start,
            scheduled_end: payload.scheduled_end,
            all_day: payload.all_day,
            notes: payload.notes,
          })
          .eq("id", id);
        if (updateError) throw new Error(updateError.message);
        startTransition(() => router.refresh());
      } else if (voiceCommand.intent === "add_personal") {
        const title = voiceCommand.title?.trim();
        if (!title) throw new Error("Missing task title.");
        const form: ScheduleItemFormValues = {
          title,
          task_type: "personal",
          date: voiceCommand.date || agenda.dateKey,
          time: voiceCommand.time || "",
          notes: voiceCommand.notes || "",
        };
        const payload = formValuesToSchedulePayload(form);
        const { error: insertError } = await supabase
          .from("schedule_items")
          .insert({
            user_id: userId,
            task_type: "personal",
            title: payload.title,
            notes: payload.notes,
            status: "todo",
            scheduled_start: payload.scheduled_start,
            scheduled_end: payload.scheduled_end,
            all_day: payload.all_day,
            source: "voice",
          });
        if (insertError) throw new Error(insertError.message);
        startTransition(() => router.refresh());
      } else {
        throw new Error("Unsupported voice command.");
      }

      setVoicePhase("idle");
      setVoiceCommand(null);
      setAcknowledgeConflicts(false);
      setConflictGate(false);
    } catch (err) {
      setVoicePhase("confirm");
      setVoiceError(
        err instanceof Error ? err.message : "Failed to run voice command"
      );
    }
  }

  function handleVoiceConfirm() {
    if (!voiceCanConfirm) return;
    if (
      voiceConflicts.length > 0 &&
      !acknowledgeConflicts &&
      (voiceCommand?.intent === "reschedule" ||
        voiceCommand?.intent === "add_personal")
    ) {
      setConflictGate(true);
      return;
    }
    void executeVoiceCommand();
  }

  function handleVoiceScheduleAnyway() {
    setAcknowledgeConflicts(true);
    setConflictGate(false);
    void executeVoiceCommand();
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-white/10 bg-[#0B1220]/80 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              Daily Command Center
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Today
            </h1>
            <p className="mt-1 text-sm text-slate-400">{dateLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-400">
              Hi {agenda.greetingName} —{" "}
              <span className="font-medium text-slate-200">
                {agenda.summary.openToday} open
              </span>
              {agenda.summary.completedToday > 0
                ? ` · ${agenda.summary.completedToday} done`
                : ""}
            </p>
            <button
              type="button"
              onClick={openCreate}
              className={touchBtnPrimary}
            >
              + Add Task
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-accent/15 via-white/[0.04] to-transparent p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                  Daily Brief
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Good day, {agenda.greetingName}
                </h2>
              </div>
              <button
                type="button"
                className={touchBtnPrimary}
                onClick={() => void handleStartBrief()}
                aria-pressed={briefTts.isPlaying}
              >
                {briefButtonLabel()}
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {agenda.briefLines.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-slate-300">
                  {line}
                </li>
              ))}
            </ul>
            {briefTts.error ? (
              <p className="mt-4 text-xs text-red-300">{briefTts.error}</p>
            ) : briefTts.isPlaying ? (
              <p className="mt-4 text-xs text-accent">
                Speaking… press Stop Brief or the mic to interrupt.
              </p>
            ) : briefTts.isLoading ? (
              <p className="mt-4 text-xs text-slate-500">
                Generating voice brief…
              </p>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                Press Start Brief to hear today’s agenda spoken aloud.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Up Next
              </h2>
              <IconClock className="h-4 w-4 text-slate-500" />
            </div>
            {agenda.upNext.length === 0 ? (
              <div className="mt-4">
                <p className="text-sm text-slate-500">
                  Nothing queued — your next hours look clear.
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-3 text-xs font-semibold text-accent hover:text-blue-400"
                >
                  + Add a timed task
                </button>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {agenda.upNext.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="text-sm font-medium text-white hover:underline"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-white">
                          {item.title}
                        </p>
                      )}
                      <p className="shrink-0 text-xs font-semibold text-accent">
                        {item.status === "overdue"
                          ? "Overdue"
                          : formatAgendaTime(item.scheduledStart)}
                      </p>
                    </div>
                    {item.subtitle ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {agenda.summary.overdueCount > 0 ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {agenda.summary.overdueCount === 1
              ? "1 overdue item needs attention — clear it before the rest of the day piles up."
              : `${agenda.summary.overdueCount} overdue items need attention — clear them before the rest of the day piles up.`}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                Today&apos;s Tasks
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {filteredItems.length} shown
                </span>
                <button
                  type="button"
                  onClick={openCreate}
                  className="text-xs font-semibold text-accent hover:text-blue-400"
                >
                  + Add
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
              {FILTERS.map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-accent/20 text-accent ring-1 ring-accent/40"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {filteredItems.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center">
                {filter === "all" && agenda.items.length === 0 ? (
                  <>
                    <p className="text-sm font-medium text-slate-200">
                      Nothing on today’s agenda yet
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Add a personal task, or project due dates and material
                      pickups will show up here automatically.
                    </p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className={`mt-4 ${touchBtnPrimary}`}
                    >
                      + Add Task
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-400">
                      No {filter === "all" ? "" : "matching "}items in this
                      filter.
                    </p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-3 text-xs font-semibold text-accent hover:text-blue-400"
                    >
                      + Add Task
                    </button>
                  </>
                )}
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
                {filteredItems.map((item) => (
                  <AgendaRow
                    key={item.id}
                    item={item}
                    busy={busyId === item.id || pending}
                    onToggleComplete={() => void toggleComplete(item)}
                    onEdit={() => openEdit(item)}
                    onDelete={() => void deleteScheduleItem(item)}
                  />
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  My Calendar
                </h2>
                <IconCalendar className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-1 text-xs text-slate-500">This week</p>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {agenda.week.map((day) => (
                  <div
                    key={day.dateKey}
                    className={`rounded-xl px-1 py-2 text-center ${
                      day.isToday
                        ? "bg-accent/20 ring-1 ring-accent/40"
                        : "bg-white/[0.02]"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase text-slate-500">
                      {day.weekday}
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        day.isToday ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {day.label}
                    </p>
                    <div className="mt-2 flex justify-center gap-0.5">
                      {Array.from({
                        length: Math.min(day.itemCount, 3),
                      }).map((_, index) => (
                        <span
                          key={index}
                          className={`h-1.5 w-1.5 rounded-full ${
                            day.isToday ? "bg-accent" : "bg-slate-500"
                          }`}
                        />
                      ))}
                      {day.itemCount === 0 ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Alerts & Updates
                </h2>
                <IconBell className="h-4 w-4 text-slate-500" />
              </div>
              {agenda.alerts.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-white/10 px-3 py-4">
                  <p className="text-sm text-slate-500">
                    No recent alerts. Inbox is quiet.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {agenda.alerts.slice(0, 5).map((alert) => {
                    const href = resolveTodayAlertHref(alert);
                    return (
                      <li key={alert.id} className="min-w-0">
                        {href ? (
                          <Link
                            href={href}
                            className="block text-sm text-slate-200 line-clamp-2 hover:text-white hover:underline"
                          >
                            {alert.message}
                          </Link>
                        ) : (
                          <p className="text-sm text-slate-200 line-clamp-2">
                            {alert.message}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatNotificationTime(alert.created_at)}
                          {!alert.read ? " · Unread" : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href="/dashboard/inbox"
                className="mt-4 inline-flex text-xs font-semibold text-accent hover:text-blue-400"
              >
                Open Inbox →
              </Link>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Daily Summary
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <SummaryMetric
                  label="Open"
                  value={String(agenda.summary.openToday)}
                />
                <SummaryMetric
                  label="Overdue"
                  value={
                    agenda.summary.overdueCount > 0
                      ? String(agenda.summary.overdueCount)
                      : "—"
                  }
                />
                <SummaryMetric
                  label="Done"
                  value={String(agenda.summary.completedToday)}
                />
                <SummaryMetric
                  label="Pickups"
                  value={String(agenda.summary.pickupsCount)}
                  icon={<IconTruck className="h-3.5 w-3.5" />}
                />
                <SummaryMetric
                  label="Payments due"
                  value={
                    agenda.summary.paymentsDueCount > 0
                      ? formatAgendaMoney(agenda.summary.paymentsDueAmount)
                      : "—"
                  }
                />
              </dl>
            </section>
          </div>
        </div>
      </div>

      {/* Mobile: fixed above bottom nav. md+: sticky in page flow (nav hidden). */}
      <div
        className="pointer-events-none h-[4.75rem] shrink-0 md:hidden"
        aria-hidden
      />
      <div className="z-40 border-t border-white/10 bg-[#0B1220]/95 px-4 py-3 backdrop-blur max-md:fixed max-md:inset-x-0 max-md:bottom-[calc(56px+env(safe-area-inset-bottom))] md:sticky md:bottom-0 md:z-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            className={`inline-flex h-12 w-12 shrink-0 touch-none items-center justify-center rounded-full text-white shadow-lg select-none ${
              isRecording
                ? "bg-red-500 shadow-red-500/30"
                : "bg-accent shadow-accent/30"
            } ${voiceBusy && !isRecording ? "opacity-60" : ""}`}
            aria-label="Push to talk"
            title="Hold to talk — mark done, reschedule, or add a personal task"
            disabled={
              voicePhase === "transcribing" ||
              voicePhase === "classifying" ||
              voicePhase === "executing"
            }
            onPointerDown={(event) => void handleMicPointerDown(event)}
            onPointerUp={() => void handleMicPointerUp()}
            onPointerCancel={() => void handleMicPointerUp()}
          >
            <IconMicrophone className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Voice command
            </p>
            <p className="mt-0.5 truncate text-sm text-slate-300">
              {voiceStatusLabel()}
            </p>
            {voiceError || recorderError ? (
              <p className="mt-1 line-clamp-2 text-xs text-red-300">
                {voiceError || recorderError}
              </p>
            ) : (
              <div className="mt-1.5 hidden gap-2 overflow-x-auto pb-0.5 sm:flex">
                {SUGGESTED_PHRASES.map((phrase) => (
                  <span
                    key={phrase}
                    className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300"
                  >
                    “{phrase}”
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className={`${touchBtnSecondary} hidden shrink-0 touch-none select-none sm:inline-flex ${
              isRecording ? "border-red-400/40 text-red-200" : ""
            }`}
            disabled={
              voicePhase === "transcribing" ||
              voicePhase === "classifying" ||
              voicePhase === "executing"
            }
            title="Hold to talk"
            onPointerDown={(event) => void handleMicPointerDown(event)}
            onPointerUp={() => void handleMicPointerUp()}
            onPointerCancel={() => void handleMicPointerUp()}
          >
            {isRecording ? "Release to send" : "Hold mic to talk"}
          </button>
        </div>
      </div>

      {formOpen ? (
        <ScheduleItemFormModal
          title={editing ? "Edit task" : "Add task"}
          initialForm={initialForm}
          isSaving={isSaving}
          existingItems={conflictCandidates}
          excludeId={editing?.id ?? null}
          onClose={closeForm}
          onSubmit={saveScheduleItem}
        />
      ) : null}

      {(voicePhase === "confirm" || voicePhase === "executing") &&
      voiceCommand ? (
        <VoiceCommandConfirmModal
          transcript={voiceTranscript}
          command={voiceCommand}
          targetTitle={voiceTargetItem?.title ?? null}
          dateKey={agenda.dateKey}
          conflicts={conflictGate ? voiceConflicts : []}
          acknowledgeConflicts={acknowledgeConflicts}
          busy={voicePhase === "executing"}
          canConfirm={voiceCanConfirm}
          onAcknowledgeConflicts={handleVoiceScheduleAnyway}
          onCancel={closeVoiceConfirm}
          onConfirm={handleVoiceConfirm}
        />
      ) : null}
    </div>
  );
}

function AgendaRow({
  item,
  busy,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  item: TodayAgendaItem;
  busy: boolean;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canComplete = item.kind === "schedule" || item.kind === "project_task";
  const canMutateSchedule = item.kind === "schedule";

  return (
    <li
      className={`px-4 py-3 ${
        item.status === "overdue" ? "bg-red-500/[0.04]" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {canComplete ? (
          <button
            type="button"
            disabled={busy}
            onClick={onToggleComplete}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] disabled:opacity-50 ${
              item.status === "completed"
                ? "border-emerald-500 bg-emerald-500 text-white"
                : item.status === "overdue"
                  ? "border-red-400/60 bg-transparent text-transparent hover:border-red-300"
                  : "border-white/20 bg-transparent text-transparent hover:border-accent"
            }`}
            aria-label={
              item.status === "completed" ? "Mark open" : "Mark done"
            }
          >
            ✓
          </button>
        ) : (
          <span className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${typeAccent(
                item.taskType
              )}`}
            >
              {scheduleTaskTypeLabel(item.taskType)}
            </span>
            <span className="text-xs text-slate-500">
              {formatAgendaTime(item.scheduledStart)}
            </span>
            {item.status === "completed" ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                <IconCheckCircle className="h-3.5 w-3.5" />
                {statusLabel(item.status)}
              </span>
            ) : item.status === "overdue" ? (
              <span className="text-xs font-semibold text-red-300">Overdue</span>
            ) : null}
          </div>

          {item.href ? (
            <Link
              href={item.href}
              className={`mt-1.5 block text-sm font-medium hover:underline ${
                item.status === "completed"
                  ? "text-slate-500 line-through"
                  : "text-white"
              }`}
            >
              {item.title}
            </Link>
          ) : (
            <p
              className={`mt-1.5 text-sm font-medium ${
                item.status === "completed"
                  ? "text-slate-500 line-through"
                  : "text-white"
              }`}
            >
              {item.title}
            </p>
          )}

          {item.subtitle ? (
            <p className="mt-0.5 text-xs text-slate-400">{item.subtitle}</p>
          ) : null}
          {typeof item.meta?.amount === "number" ? (
            <p className="mt-1 text-xs font-semibold text-amber-200">
              {formatAgendaMoney(item.meta.amount)}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-3">
            {item.href ? (
              <Link
                href={item.href}
                className="text-xs font-semibold text-accent hover:text-blue-400"
              >
                {item.hrefLabel || "Open"}
              </Link>
            ) : null}
            {canMutateSchedule ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onEdit}
                  className="text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDelete}
                  className="text-xs font-semibold text-red-300 hover:text-red-200 disabled:opacity-50"
                >
                  Delete
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function SummaryMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
      <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-white">{value}</dd>
    </div>
  );
}
