"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  IconBell,
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconMicrophone,
  IconSettings,
  IconTruck,
  IconUsers,
} from "@/components/dashboard/icons";
import { IconMore, IconSearch } from "@/components/dashboard/workspace-icons";
import {
  ScheduleItemFormModal,
  emptyScheduleItemForm,
  formValuesToSchedulePayload,
  scheduleItemToForm,
  type ScheduleItemFormValues,
} from "@/components/today/schedule-item-form-modal";
import {
  EmaAvatar,
  PriorityBadge,
  StatPill,
  TaskTypeIconBox,
} from "@/components/today/today-visuals";
import {
  TimelineHourLabel,
  TimelineNowMarker,
  buildTimelineSlots,
} from "@/components/today/today-timeline";
import { VoiceCommandConfirmModal } from "@/components/today/voice-command-confirm-modal";
import { AlertRescheduleModal } from "@/components/today/alert-reschedule-modal";
import { QuickAddLadderModal } from "@/components/today/quick-add-ladder";
import {
  touchBtnSecondary,
} from "@/components/quotes/ui";
import { useTtsPlayback } from "@/hooks/use-tts-playback";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import {
  findScheduleConflicts,
  type ScheduleConflictCandidate,
} from "@/lib/schedule-conflicts";
import {
  USER_TIMEZONE_COOKIE,
  detectBrowserTimeZone,
} from "@/lib/local-date";
import { createClient } from "@/lib/supabase";
import {
  alreadyScheduledFromAlert,
  buildAlertScheduleDraft,
  draftToScheduleInsert,
  isAddableTodayAlert,
  type AlertScheduleDraft,
} from "@/lib/today-alert-actions";
import {
  buildDailySummarySentence,
  formatAgendaMoney,
  formatAgendaTime,
  resolveTodayAlertHref,
  type TodayAgendaItem,
  type TodayAgendaViewModel,
} from "@/lib/today-agenda";
import {
  toVoiceAgendaCandidates,
  toVoiceProjectCandidates,
  type TodayVoiceCommandResult,
  type TodayVoiceProjectCandidate,
} from "@/lib/today-voice-command";
import {
  formatNotificationTime,
  type AppNotification,
} from "@/types/notification";
import type { AgendaPriority, ScheduleItem } from "@/types/schedule-item";
import { isScheduleTaskType } from "@/types/schedule-item";

type VoicePhase =
  | "idle"
  | "transcribing"
  | "classifying"
  | "confirm"
  | "executing";

const BRIEF_TTS_INSTRUCTIONS =
  "Speak like a calm, clear executive assistant delivering a morning briefing. Warm but efficient, natural pacing with short pauses between sentences. No theatrical flourish.";

type ListFilter = "all" | "work" | "personal";

/** Hold longer than this → PTT; shorter release → daily brief tap. */
const MIC_HOLD_MS = 280;

function sourceIdFromAgenda(item: TodayAgendaItem): string | null {
  const colon = item.id.indexOf(":");
  if (colon < 0) return null;
  return item.id.slice(colon + 1) || null;
}

function isPersonalItem(item: TodayAgendaItem): boolean {
  return item.taskType === "personal";
}

function formatEstDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function estimateItemMinutes(item: TodayAgendaItem): number {
  if (item.status === "completed" || item.status === "cancelled") return 0;
  if (item.allDay || !item.scheduledStart) return 30;
  if (item.scheduledEnd) {
    const start = new Date(item.scheduledStart).getTime();
    const end = new Date(item.scheduledEnd).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      return Math.max(15, Math.round((end - start) / 60000));
    }
  }
  return 60;
}

export function TodayPage({
  agenda,
  scheduleItems,
  projects,
  userId,
}: {
  agenda: TodayAgendaViewModel;
  scheduleItems: ScheduleItem[];
  projects: TodayVoiceProjectCandidate[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<ListFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [createPrefill, setCreatePrefill] =
    useState<ScheduleItemFormValues | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  const [briefPreview, setBriefPreview] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddParsing, setQuickAddParsing] = useState(false);
  const [micHighlight, setMicHighlight] = useState(false);
  const briefMicRef = useRef<HTMLButtonElement | null>(null);
  const micHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micPointerActiveRef = useRef(false);
  const micHoldArmedRef = useRef(false);
  const briefTts = useTtsPlayback();

  useEffect(() => {
    const tz = detectBrowserTimeZone();
    document.cookie = `${USER_TIMEZONE_COOKIE}=${encodeURIComponent(
      tz
    )}; path=/; max-age=31536000; SameSite=Lax`;
    if (agenda.timeZone && tz !== agenda.timeZone) {
      router.refresh();
    }
  }, [agenda.timeZone, router]);

  useEffect(() => {
    return () => {
      if (micHoldTimerRef.current != null) {
        clearTimeout(micHoldTimerRef.current);
      }
    };
  }, []);

  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceCommand, setVoiceCommand] =
    useState<TodayVoiceCommandResult | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [acknowledgeConflicts, setAcknowledgeConflicts] = useState(false);
  const [conflictGate, setConflictGate] = useState(false);
  const [voiceSelectedProjectId, setVoiceSelectedProjectId] = useState<
    string | null
  >(null);
  const [voiceKeepAsPersonal, setVoiceKeepAsPersonal] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(
    () => new Set()
  );
  const [alertBusyId, setAlertBusyId] = useState<string | null>(null);
  const [rescheduleDraft, setRescheduleDraft] =
    useState<AlertScheduleDraft | null>(null);
  const [rescheduleAlertId, setRescheduleAlertId] = useState<string | null>(
    null
  );
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  const briefScript = useMemo(
    () => agenda.briefLines.join(" "),
    [agenda.briefLines]
  );

  const classifyCommand = useCallback(
    async (transcript: string): Promise<TodayVoiceCommandResult> => {
      const classifyResponse = await fetch("/api/today-voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          dateKey: agenda.dateKey,
          candidates: toVoiceAgendaCandidates(agenda.items),
          projects: toVoiceProjectCandidates(projects),
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
      return classifyData.command;
    },
    [agenda.dateKey, agenda.items, projects]
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

        const command = await classifyCommand(transcript);
        setVoiceCommand(command);
        setVoiceSelectedProjectId(command.projectId);
        setVoiceKeepAsPersonal(false);
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
    [classifyCommand]
  );

  const {
    status: recorderStatus,
    error: recorderError,
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

  function clearMicHoldTimer() {
    if (micHoldTimerRef.current != null) {
      clearTimeout(micHoldTimerRef.current);
      micHoldTimerRef.current = null;
    }
  }

  function handleMicPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (
      voicePhase === "confirm" ||
      voicePhase === "transcribing" ||
      voicePhase === "classifying" ||
      voicePhase === "executing"
    ) {
      return;
    }

    micPointerActiveRef.current = true;
    micHoldArmedRef.current = false;
    clearMicHoldTimer();

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may fail on some browsers; hold-to-talk still works.
    }

    micHoldTimerRef.current = setTimeout(() => {
      if (!micPointerActiveRef.current) return;
      micHoldArmedRef.current = true;
      if (briefTts.isPlaying || briefTts.isLoading) {
        briefTts.stop();
      }
      setVoiceError(null);
      void startRecording();
    }, MIC_HOLD_MS);
  }

  async function handleMicPointerUp() {
    const wasHold = micHoldArmedRef.current;
    micPointerActiveRef.current = false;
    clearMicHoldTimer();

    if (wasHold || isRecording) {
      micHoldArmedRef.current = false;
      if (isRecording) {
        await stopRecording();
      }
      return;
    }

    // Short tap → daily brief (or stop if already playing)
    if (
      voicePhase === "confirm" ||
      voicePhase === "transcribing" ||
      voicePhase === "classifying" ||
      voicePhase === "executing"
    ) {
      return;
    }
    await handleStartBrief();
  }

  function voiceStatusLabel() {
    if (isRecording) return "Listening…";
    if (voicePhase === "transcribing") return "Transcribing…";
    if (voicePhase === "classifying") return "Understanding…";
    if (voicePhase === "executing") return "Updating agenda…";
    if (voicePhase === "confirm") return "Confirm the command below";
    if (briefTts.isLoading) return "Generating brief…";
    if (briefTts.isPlaying) return "Playing brief… · tap to stop";
    return "Tap for brief · Hold to talk";
  }

  const filterCounts = useMemo(() => {
    const all = agenda.items.length;
    const personal = agenda.items.filter(isPersonalItem).length;
    return {
      all,
      work: all - personal,
      personal,
    };
  }, [agenda.items]);

  const filteredItems = useMemo(() => {
    if (filter === "personal") return agenda.items.filter(isPersonalItem);
    if (filter === "work") return agenda.items.filter((item) => !isPersonalItem(item));
    return agenda.items;
  }, [agenda.items, filter]);

  const dateLabel = useMemo(() => {
    const [y, m, d] = agenda.dateKey.split("-").map(Number);
    const date = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
    return date.toLocaleDateString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [agenda.dateKey]);

  const estMinutes = useMemo(
    () => agenda.items.reduce((sum, item) => sum + estimateItemMinutes(item), 0),
    [agenda.items]
  );

  const weekDaysSunFirst = useMemo(() => {
    if (agenda.week.length !== 7) return agenda.week;
    return [agenda.week[6], ...agenda.week.slice(0, 6)];
  }, [agenda.week]);

  const calendarEvents = useMemo(
    () =>
      agenda.items
        .filter(
          (item) =>
            item.status !== "completed" &&
            item.status !== "cancelled" &&
            item.scheduledStart
        )
        .slice(0, 4),
    [agenda.items]
  );

  const timeline = useMemo(
    () => buildTimelineSlots(filteredItems, agenda.timeZone),
    [filteredItems, agenda.timeZone]
  );

  const visibleAlerts = useMemo(
    () => agenda.alerts.filter((alert) => !dismissedAlertIds.has(alert.id)),
    [agenda.alerts, dismissedAlertIds]
  );

  const dailySummarySentence = useMemo(
    () => buildDailySummarySentence(agenda.summary, agenda.timeZone),
    [agenda.summary, agenda.timeZone]
  );

  function focusBriefMic() {
    briefMicRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setMicHighlight(true);
    window.setTimeout(() => setMicHighlight(false), 1600);
  }

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
        : createPrefill ?? emptyScheduleItemForm(agenda.dateKey),
    [editing, createPrefill, agenda.dateKey]
  );

  function openQuickAdd() {
    setError(null);
    setQuickAddOpen(true);
  }

  function openCreate(prefill?: ScheduleItemFormValues | null) {
    setEditing(null);
    setCreatePrefill(prefill ?? null);
    setError(null);
    setQuickAddOpen(false);
    setFormOpen(true);
  }

  function openEdit(item: TodayAgendaItem) {
    if (item.kind !== "schedule") return;
    const id = sourceIdFromAgenda(item);
    if (!id) return;
    const row = scheduleItems.find((s) => s.id === id) ?? null;
    if (!row) return;
    setEditing(row);
    setCreatePrefill(null);
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setFormOpen(false);
    setEditing(null);
    setCreatePrefill(null);
  }

  async function saveScheduleItem(form: ScheduleItemFormValues) {
    if (!userId) {
      setError("Sign in required to save schedule items.");
      throw new Error("missing user");
    }
    setIsSaving(true);
    setError(null);
    const payload = formValuesToSchedulePayload(form);
    const customerId = payload.project_id
      ? projects.find((p) => p.id === payload.project_id)?.customerId ?? null
      : null;

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
            priority: payload.priority,
            project_id: payload.project_id,
            customer_id: customerId,
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
          priority: payload.priority,
          project_id: payload.project_id,
          customer_id: customerId,
          source: "manual",
        });

    setIsSaving(false);
    if (saveError) {
      setError(saveError.message);
      throw saveError;
    }

    setFormOpen(false);
    setEditing(null);
    setCreatePrefill(null);
    startTransition(() => router.refresh());
  }

  async function markAlertRead(alertId: string) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", alertId);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setDismissedAlertIds((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
    return true;
  }

  async function dismissAlert(alert: AppNotification) {
    setAlertBusyId(alert.id);
    setError(null);
    await markAlertRead(alert.id);
    setAlertBusyId(null);
    startTransition(() => router.refresh());
  }

  async function insertFromAlertDraft(draft: AlertScheduleDraft, alertId: string) {
    if (!userId) {
      setError("Sign in required to add schedule items.");
      return false;
    }
    const payload = draftToScheduleInsert(draft, userId, agenda.timeZone);
    const { error: insertError } = await supabase
      .from("schedule_items")
      .insert(payload);
    if (insertError) {
      setError(insertError.message);
      return false;
    }
    await markAlertRead(alertId);
    return true;
  }

  async function addAlertToToday(alert: AppNotification) {
    const draft = buildAlertScheduleDraft(alert, agenda.dateKey);
    if (!draft) return;
    if (alreadyScheduledFromAlert(alert, scheduleItems)) {
      setError("This pickup is already on your schedule.");
      return;
    }
    setAlertBusyId(alert.id);
    setError(null);
    const ok = await insertFromAlertDraft(draft, alert.id);
    setAlertBusyId(null);
    if (ok) startTransition(() => router.refresh());
  }

  function openAlertReschedule(alert: AppNotification) {
    const draft = buildAlertScheduleDraft(alert, agenda.dateKey);
    if (!draft) return;
    if (alreadyScheduledFromAlert(alert, scheduleItems)) {
      setError("This pickup is already on your schedule.");
      return;
    }
    setRescheduleDraft(draft);
    setRescheduleAlertId(alert.id);
  }

  async function confirmAlertReschedule(next: {
    dateKey: string;
    timeHm: string;
  }) {
    if (!rescheduleDraft || !rescheduleAlertId) return;
    setRescheduleBusy(true);
    setError(null);
    const draft: AlertScheduleDraft = {
      ...rescheduleDraft,
      dateKey: next.dateKey,
      timeHm: next.timeHm,
    };
    const ok = await insertFromAlertDraft(draft, rescheduleAlertId);
    setRescheduleBusy(false);
    if (ok) {
      setRescheduleDraft(null);
      setRescheduleAlertId(null);
      startTransition(() => router.refresh());
    }
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

  const resolvedVoiceProjectId = useMemo(() => {
    if (voiceKeepAsPersonal) return null;
    return voiceSelectedProjectId || voiceCommand?.projectId || null;
  }, [voiceCommand?.projectId, voiceKeepAsPersonal, voiceSelectedProjectId]);

  const voiceCanConfirm = useMemo(() => {
    if (!voiceCommand) return false;
    if (voiceCommand.intent === "unknown") return false;
    if (voiceCommand.confidence > 0 && voiceCommand.confidence < 0.45) {
      // Allow confirm when waiting only on project pick (user resolves via UI).
      if (
        !(
          voiceCommand.intent === "add_item" &&
          voiceCommand.needsProjectClarification
        )
      ) {
        return false;
      }
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
    if (voiceCommand.intent === "add_item") {
      if (!voiceCommand.title?.trim()) return false;
      if (voiceCommand.needsProjectClarification) {
        return Boolean(resolvedVoiceProjectId || voiceKeepAsPersonal);
      }
      return true;
    }
    return false;
  }, [
    agenda.dateKey,
    resolvedVoiceProjectId,
    voiceCommand,
    voiceKeepAsPersonal,
    voiceTargetItem,
  ]);

  const voiceConflicts = useMemo((): ScheduleConflictCandidate[] => {
    if (!voiceCommand) return [];
    if (
      voiceCommand.intent !== "reschedule" &&
      voiceCommand.intent !== "add_item"
    ) {
      return [];
    }
    if (!voiceCommand.time) return [];

    const taskType =
      voiceCommand.intent === "add_item"
        ? voiceCommand.taskType && isScheduleTaskType(voiceCommand.taskType)
          ? voiceCommand.taskType
          : "personal"
        : voiceTargetItem?.taskType || "other";

    const form: ScheduleItemFormValues = {
      title:
        voiceCommand.intent === "add_item"
          ? voiceCommand.title || "Task"
          : voiceTargetItem?.title || "Scheduled item",
      task_type: isScheduleTaskType(String(taskType)) ? taskType : "other",
      date: voiceCommand.date || agenda.dateKey,
      time: voiceCommand.time,
      notes: voiceCommand.notes || "",
      priority: (voiceCommand.priority as AgendaPriority) || "medium",
      project_id: resolvedVoiceProjectId || "",
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
    resolvedVoiceProjectId,
    voiceCommand,
    voiceTargetItem,
  ]);

  function closeVoiceConfirm() {
    if (voicePhase === "executing") return;
    setVoicePhase("idle");
    setVoiceCommand(null);
    setVoiceSelectedProjectId(null);
    setVoiceKeepAsPersonal(false);
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
          priority: row.priority || "medium",
          project_id: row.project_id || "",
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
      } else if (voiceCommand.intent === "add_item") {
        const title = voiceCommand.title?.trim();
        if (!title) throw new Error("Missing task title.");
        const inferredType =
          voiceCommand.taskType && isScheduleTaskType(voiceCommand.taskType)
            ? voiceCommand.taskType
            : "personal";
        const projectId = voiceKeepAsPersonal ? null : resolvedVoiceProjectId;
        const matched = projectId
          ? projects.find((p) => p.id === projectId)
          : null;
        const form: ScheduleItemFormValues = {
          title,
          task_type: inferredType,
          date: voiceCommand.date || agenda.dateKey,
          time: voiceCommand.time || "",
          notes: voiceCommand.notes || "",
          priority: voiceCommand.priority || "medium",
          project_id: projectId || "",
        };
        const payload = formValuesToSchedulePayload(form);
        const { error: insertError } = await supabase
          .from("schedule_items")
          .insert({
            user_id: userId,
            task_type: payload.task_type,
            title: payload.title,
            notes: payload.notes,
            status: "todo",
            scheduled_start: payload.scheduled_start,
            scheduled_end: payload.scheduled_end,
            all_day: payload.all_day,
            priority: payload.priority,
            project_id: payload.project_id,
            customer_id: matched?.customerId ?? null,
            source: "voice",
          });
        if (insertError) throw new Error(insertError.message);
        startTransition(() => router.refresh());
      } else {
        throw new Error("Unsupported voice command.");
      }

      setVoicePhase("idle");
      setVoiceCommand(null);
      setVoiceSelectedProjectId(null);
      setVoiceKeepAsPersonal(false);
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
        voiceCommand?.intent === "add_item")
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

  async function handleQuickParseText(text: string) {
    setQuickAddParsing(true);
    setVoiceError(null);
    setError(null);
    try {
      setVoiceTranscript(text);
      setVoicePhase("classifying");
      const command = await classifyCommand(text);
      setQuickAddOpen(false);
      setVoiceCommand(command);
      setVoiceSelectedProjectId(command.projectId);
      setVoiceKeepAsPersonal(false);
      setAcknowledgeConflicts(false);
      setConflictGate(false);
      setVoicePhase("confirm");
    } catch (err) {
      setVoicePhase("idle");
      setVoiceCommand(null);
      setError(err instanceof Error ? err.message : "Could not parse that");
    } finally {
      setQuickAddParsing(false);
    }
  }

  function handleQuickAddVoice() {
    setQuickAddOpen(false);
    focusBriefMic();
  }

  function handleQuickAddFullForm() {
    openCreate(null);
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* —— Header —— */}
      <div className="border-b border-white/10 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-white">Today</h1>
            <p className="mt-1 text-sm text-slate-400">
              Your daily overview and tasks
            </p>
          </div>

          <div className="flex items-center gap-1 self-end lg:self-auto">
            <button
              type="button"
              onClick={openQuickAdd}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              title="Quick add"
              aria-label="Quick add"
            >
              <IconSearch className="h-5 w-5" />
            </button>
            <a
              href="#today-calendar"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              title="Calendar"
            >
              <IconCalendar className="h-5 w-5" />
            </a>
            <Link
              href="/dashboard/inbox"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              title="Notifications"
            >
              <IconBell className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard/settings"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              title="Account"
            >
              <IconUsers className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Date + stats */}
        <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2 font-medium text-white">
              <IconCalendar className="h-4 w-4 text-accent" />
              {dateLabel}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill
              tone="blue"
              icon={<IconCheckCircle className="h-3.5 w-3.5" />}
              value={String(agenda.summary.totalToday)}
              label="Total Tasks"
            />
            <StatPill
              tone="green"
              icon={<IconClock className="h-3.5 w-3.5" />}
              value={String(agenda.summary.openToday)}
              label="Due Today"
            />
            <StatPill
              tone="red"
              icon={<IconBell className="h-3.5 w-3.5" />}
              value={String(agenda.summary.overdueCount)}
              label="Overdue"
            />
            <StatPill
              tone="yellow"
              icon={<IconTruck className="h-3.5 w-3.5" />}
              value={String(agenda.summary.highPriorityCount)}
              label="High Priority"
            />
            <StatPill
              tone="purple"
              icon={<IconClock className="h-3.5 w-3.5" />}
              value={formatEstDuration(estMinutes)}
              label="Est. Time"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.9fr)]">
          {/* —— Today's Tasks / Timeline —— */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Today&apos;s Timeline
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Hour-by-hour view · gaps show free time
                </p>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-xs">Sort by time</span>
                <IconMore className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {(
                [
                  { id: "all" as const, label: "All", count: filterCounts.all },
                  { id: "work" as const, label: "Work", count: filterCounts.work },
                  {
                    id: "personal" as const,
                    label: "Personal",
                    count: filterCounts.personal,
                  },
                ] as const
              ).map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-accent text-white shadow-md shadow-accent/30"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                );
              })}
            </div>

            {agenda.summary.conflictCount > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100">
                {agenda.summary.conflictCount} schedule conflict
                {agenda.summary.conflictCount === 1 ? "" : "s"} today — items
                within ±60 minutes are flagged on the timeline.
              </div>
            ) : null}

            {filteredItems.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center">
                <p className="text-sm text-slate-400">No tasks in this filter.</p>
                <button
                  type="button"
                  onClick={openQuickAdd}
                  className="mt-3 text-sm font-semibold text-accent hover:text-blue-400"
                >
                  + Add Task
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {timeline.allDay.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      All day
                    </p>
                    <ul className="overflow-hidden rounded-2xl border border-white/10 divide-y divide-white/10">
                      {timeline.allDay.map((item) => (
                        <AgendaRow
                          key={item.id}
                          item={item}
                          busy={busyId === item.id || pending}
                          menuOpen={menuOpenId === item.id}
                          onToggleMenu={() =>
                            setMenuOpenId((id) =>
                              id === item.id ? null : item.id
                            )
                          }
                          onCloseMenu={() => setMenuOpenId(null)}
                          onToggleComplete={() => void toggleComplete(item)}
                          onEdit={() => {
                            setMenuOpenId(null);
                            openEdit(item);
                          }}
                          onDelete={() => {
                            setMenuOpenId(null);
                            void deleteScheduleItem(item);
                          }}
                        />
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="relative space-y-0">
                  {timeline.slots.map((slot) => {
                    const empty = slot.items.length === 0;
                    return (
                      <div key={slot.hour} className="relative">
                        {timeline.nowHour === slot.hour ? (
                          <TimelineNowMarker />
                        ) : null}
                        <div className="flex gap-3 py-2">
                          <TimelineHourLabel
                            label={slot.label}
                            empty={empty}
                          />
                          <div className="relative min-w-0 flex-1 border-l border-white/10 pl-4">
                            {empty ? (
                              <div className="flex h-8 items-center">
                                <span className="text-[11px] text-slate-600">
                                  Free
                                </span>
                              </div>
                            ) : (
                              <ul className="space-y-2">
                                {slot.items.map((item) => (
                                  <li
                                    key={item.id}
                                    className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
                                  >
                                    <AgendaRow
                                      item={item}
                                      busy={busyId === item.id || pending}
                                      menuOpen={menuOpenId === item.id}
                                      onToggleMenu={() =>
                                        setMenuOpenId((id) =>
                                          id === item.id ? null : item.id
                                        )
                                      }
                                      onCloseMenu={() => setMenuOpenId(null)}
                                      onToggleComplete={() =>
                                        void toggleComplete(item)
                                      }
                                      onEdit={() => {
                                        setMenuOpenId(null);
                                        openEdit(item);
                                      }}
                                      onDelete={() => {
                                        setMenuOpenId(null);
                                        void deleteScheduleItem(item);
                                      }}
                                    />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={openQuickAdd}
                className="text-sm font-semibold text-accent hover:text-blue-400"
              >
                + Add Task
              </button>
            </div>
          </section>

          {/* —— Right rail —— */}
          <div className="space-y-5">
            {/* Daily Brief */}
            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-accent/20 via-white/[0.04] to-transparent p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    Daily Brief
                  </p>
                  <span className="mt-0.5 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    Beta
                  </span>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-400">
                  Driving Mode
                  <button
                    type="button"
                    role="switch"
                    aria-checked={drivingMode}
                    onClick={() => setDrivingMode((v) => !v)}
                    className={`relative h-5 w-9 rounded-full transition ${
                      drivingMode ? "bg-accent" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                        drivingMode ? "left-4" : "left-0.5"
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div className="mt-5 flex flex-col items-center text-center">
                <div className="relative flex items-center gap-4">
                  <EmaAvatar
                    size="lg"
                    speaking={briefTts.isPlaying || isRecording}
                  />
                  <button
                    ref={briefMicRef}
                    type="button"
                    className={`inline-flex h-14 w-14 touch-none items-center justify-center rounded-full text-white shadow-xl select-none transition ${
                      isRecording
                        ? "bg-red-500 shadow-red-500/40"
                        : briefTts.isPlaying || briefTts.isLoading
                          ? "bg-accent/80 shadow-accent/30"
                          : "bg-accent shadow-accent/40"
                    } ${
                      voiceBusy && !isRecording && !briefTts.isPlaying
                        ? "opacity-60"
                        : ""
                    } ${
                      micHighlight
                        ? "ring-4 ring-accent/50 ring-offset-2 ring-offset-[#0B1220]"
                        : ""
                    }`}
                    aria-label="Tap for daily brief, hold to talk to Ema"
                    disabled={
                      voicePhase === "transcribing" ||
                      voicePhase === "classifying" ||
                      voicePhase === "executing"
                    }
                    onPointerDown={(event) => handleMicPointerDown(event)}
                    onPointerUp={() => void handleMicPointerUp()}
                    onPointerCancel={() => void handleMicPointerUp()}
                  >
                    <IconMicrophone className="h-6 w-6" />
                  </button>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-400">
                  {voiceError || recorderError || voiceStatusLabel()}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  Good day, {agenda.greetingName}!
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Shall I brief your day?
                </p>

                {(briefPreview || briefTts.isPlaying || briefTts.status === "ended") && (
                  <ul className="mt-4 w-full space-y-1.5 text-left">
                    {agenda.briefLines.map((line) => (
                      <li
                        key={line}
                        className="text-xs leading-relaxed text-slate-300"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                )}

                {briefTts.error ? (
                  <p className="mt-3 text-xs text-red-300">{briefTts.error}</p>
                ) : null}

                <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => setBriefPreview((v) => !v)}
                    className={`${touchBtnSecondary} w-full sm:w-auto`}
                  >
                    Preview
                  </button>
                  <Link
                    href="/dashboard/settings"
                    className={`${touchBtnSecondary} inline-flex w-full items-center justify-center gap-1.5 sm:w-auto`}
                  >
                    <IconSettings className="h-4 w-4" />
                    Settings
                  </Link>
                </div>
              </div>
            </section>

            {/* Up Next */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Up Next
                </h2>
                <a
                  href="#today-calendar"
                  className="text-xs font-semibold text-accent hover:text-blue-400"
                >
                  View Calendar
                </a>
              </div>
              {agenda.upNext.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Nothing queued.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {agenda.upNext.map((item) => (
                    <li key={item.id} className="flex items-start gap-3">
                      <TaskTypeIconBox type={item.taskType} />
                      <div className="min-w-0 flex-1">
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="block truncate text-sm font-medium text-white hover:underline"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-medium text-white">
                            {item.title}
                          </p>
                        )}
                        {item.subtitle ? (
                          <p className="truncate text-xs text-slate-500">
                            {item.subtitle}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-accent">
                        {formatAgendaTime(item.scheduledStart)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* My Calendar */}
            <section
              id="today-calendar"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  My Calendar
                </h2>
                <IconCalendar className="h-4 w-4 text-slate-500" />
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1">
                {weekDaysSunFirst.map((day) => (
                  <div
                    key={day.dateKey}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] font-semibold uppercase text-slate-500">
                      {day.weekday.slice(0, 3)}
                    </span>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        day.isToday
                          ? "bg-accent text-white shadow-md shadow-accent/30"
                          : "text-slate-300"
                      }`}
                    >
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>

              {calendarEvents.length === 0 ? (
                <p className="mt-4 text-xs text-slate-500">No timed events today.</p>
              ) : (
                <ul className="relative mt-5 space-y-3 border-l border-accent/40 pl-4">
                  {calendarEvents.map((item) => (
                    <li key={item.id} className="relative">
                      <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                      <p className="text-xs font-semibold text-accent">
                        {formatAgendaTime(item.scheduledStart)}
                      </p>
                      <p className="text-sm text-slate-200">{item.title}</p>
                    </li>
                  ))}
                  {agenda.items.filter((i) => i.scheduledStart).length >
                  calendarEvents.length ? (
                    <li className="text-xs font-semibold text-accent">
                      +
                      {agenda.items.filter((i) => i.scheduledStart).length -
                        calendarEvents.length}{" "}
                      more events
                    </li>
                  ) : null}
                </ul>
              )}
            </section>

            {/* Alerts */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Alerts & Updates
                </h2>
                <Link
                  href="/dashboard/inbox"
                  className="text-xs font-semibold text-accent hover:text-blue-400"
                >
                  View all
                </Link>
              </div>
              {visibleAlerts.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Inbox is quiet.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {visibleAlerts.slice(0, 4).map((alert) => {
                    const href = resolveTodayAlertHref(alert);
                    const addable = isAddableTodayAlert(alert);
                    const alreadyOn =
                      addable &&
                      alreadyScheduledFromAlert(alert, scheduleItems);
                    const busy = alertBusyId === alert.id;
                    return (
                      <li key={alert.id} className="flex gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                          <IconBell className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          {href ? (
                            <Link
                              href={href}
                              className="block text-sm font-semibold text-white line-clamp-2 hover:underline"
                            >
                              {alert.message}
                            </Link>
                          ) : (
                            <p className="text-sm font-semibold text-white line-clamp-2">
                              {alert.message}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {formatNotificationTime(alert.created_at)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {addable && !alreadyOn ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busy || pending}
                                  onClick={() => void addAlertToToday(alert)}
                                  className="rounded-lg bg-accent/20 px-2.5 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent/30 disabled:opacity-50"
                                >
                                  Add to Today
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || pending}
                                  onClick={() => openAlertReschedule(alert)}
                                  className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                                >
                                  Reschedule
                                </button>
                              </>
                            ) : null}
                            {addable && alreadyOn ? (
                              <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                                On schedule
                              </span>
                            ) : null}
                            {href && !addable ? (
                              <Link
                                href={href}
                                className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/5"
                              >
                                Open
                              </Link>
                            ) : null}
                            <button
                              type="button"
                              disabled={busy || pending}
                              onClick={() => void dismissAlert(alert)}
                              className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-white/5 hover:text-slate-300 disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Daily Summary */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Daily Summary
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-200">
                {dailySummarySentence}
              </p>
              {agenda.summary.openToday === 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  Nothing open on the agenda right now.
                </p>
              ) : null}
            </section>
          </div>
        </div>
      </div>

      {formOpen ? (
        <ScheduleItemFormModal
          title={editing ? "Edit task" : "Add task"}
          initialForm={initialForm}
          isSaving={isSaving}
          existingItems={conflictCandidates}
          projects={projects}
          excludeId={editing?.id ?? null}
          onClose={closeForm}
          onSubmit={saveScheduleItem}
        />
      ) : null}

      <QuickAddLadderModal
        open={quickAddOpen}
        busy={quickAddParsing || voiceBusy}
        onClose={() => {
          if (quickAddParsing) return;
          setQuickAddOpen(false);
        }}
        onChooseVoice={handleQuickAddVoice}
        onParseText={handleQuickParseText}
        onChooseFullForm={handleQuickAddFullForm}
      />

      {(voicePhase === "confirm" || voicePhase === "executing") &&
      voiceCommand ? (
        <VoiceCommandConfirmModal
          transcript={voiceTranscript}
          command={voiceCommand}
          targetTitle={voiceTargetItem?.title ?? null}
          dateKey={agenda.dateKey}
          projects={projects}
          selectedProjectId={voiceSelectedProjectId}
          keepAsPersonal={voiceKeepAsPersonal}
          conflicts={conflictGate ? voiceConflicts : []}
          acknowledgeConflicts={acknowledgeConflicts}
          busy={voicePhase === "executing"}
          canConfirm={voiceCanConfirm}
          onSelectProject={(projectId) => {
            setVoiceSelectedProjectId(projectId);
            setVoiceKeepAsPersonal(false);
          }}
          onKeepAsPersonal={() => {
            setVoiceKeepAsPersonal(true);
            setVoiceSelectedProjectId(null);
          }}
          onAcknowledgeConflicts={handleVoiceScheduleAnyway}
          onCancel={closeVoiceConfirm}
          onConfirm={handleVoiceConfirm}
        />
      ) : null}

      <AlertRescheduleModal
        open={Boolean(rescheduleDraft && rescheduleAlertId)}
        draft={rescheduleDraft}
        busy={rescheduleBusy}
        onClose={() => {
          if (rescheduleBusy) return;
          setRescheduleDraft(null);
          setRescheduleAlertId(null);
        }}
        onConfirm={(next) => void confirmAlertReschedule(next)}
      />
    </div>
  );
}

function AgendaRow({
  item,
  busy,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  item: TodayAgendaItem;
  busy: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canComplete = item.kind === "schedule" || item.kind === "project_task";
  const canMutateSchedule = item.kind === "schedule";

  return (
    <li
      className={`relative px-3 py-3 sm:px-4 ${
        item.status === "overdue" ? "bg-red-500/[0.04]" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {canComplete ? (
          <button
            type="button"
            disabled={busy}
            onClick={onToggleComplete}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] disabled:opacity-50 ${
              item.status === "completed"
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-white/25 bg-transparent text-transparent hover:border-accent"
            }`}
            aria-label={
              item.status === "completed" ? "Mark open" : "Mark done"
            }
          >
            ✓
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden />
        )}

        <TaskTypeIconBox type={item.taskType} />

        <div className="min-w-0 flex-1">
          {item.href ? (
            <Link
              href={item.href}
              className={`block truncate text-sm font-semibold hover:underline ${
                item.status === "completed"
                  ? "text-slate-500 line-through"
                  : "text-white"
              }`}
            >
              {item.title}
            </Link>
          ) : (
            <p
              className={`truncate text-sm font-semibold ${
                item.status === "completed"
                  ? "text-slate-500 line-through"
                  : "text-white"
              }`}
            >
              {item.title}
            </p>
          )}
          {item.subtitle ? (
            <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
          ) : null}
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {item.status === "overdue" ? (
              <span className="text-[11px] font-semibold text-red-300">
                Overdue
              </span>
            ) : null}
            {item.hasConflict ? (
              <span
                className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200 ring-1 ring-amber-500/30"
                title={
                  item.conflictLabels?.length
                    ? `Near: ${item.conflictLabels.join(", ")}`
                    : "Within ±60 minutes of another item"
                }
              >
                Schedule conflict
              </span>
            ) : null}
          </div>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-sm font-semibold text-slate-200">
            {formatAgendaTime(item.scheduledStart)}
          </p>
          {typeof item.meta?.amount === "number" ? (
            <p className="text-xs text-amber-200">
              {formatAgendaMoney(item.meta.amount)}
            </p>
          ) : null}
        </div>

        <PriorityBadge priority={item.priority} />

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onToggleMenu}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="More actions"
          >
            <IconMore className="h-5 w-5" />
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close menu"
                onClick={onCloseMenu}
              />
              <div className="absolute right-0 z-20 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-white/10 bg-navy py-1 shadow-xl">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                    onClick={onCloseMenu}
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
                      className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={onDelete}
                      className="block w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-white/5 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                ) : null}
                {!item.href && !canMutateSchedule ? (
                  <p className="px-3 py-2 text-xs text-slate-500">No actions</p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
