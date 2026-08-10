import type { TodayAgendaItem } from "@/lib/today-agenda";
import { formatAgendaTime } from "@/lib/today-agenda";

export const TODAY_VOICE_INTENTS = [
  "mark_done",
  "reschedule",
  "add_personal",
  "unknown",
] as const;

export type TodayVoiceIntent = (typeof TODAY_VOICE_INTENTS)[number];

export type TodayVoiceAgendaCandidate = {
  id: string;
  kind: TodayAgendaItem["kind"];
  title: string;
  taskType: string;
  status: string;
  timeLabel: string;
  subtitle: string | null;
  completable: boolean;
  reschedulable: boolean;
};

export type TodayVoiceCommandResult = {
  intent: TodayVoiceIntent;
  confidence: number;
  targetAgendaId: string | null;
  title: string | null;
  date: string | null;
  time: string | null;
  notes: string | null;
  clarification: string | null;
};

export function isTodayVoiceIntent(value: string): value is TodayVoiceIntent {
  return (TODAY_VOICE_INTENTS as readonly string[]).includes(value);
}

export function toVoiceAgendaCandidates(
  items: TodayAgendaItem[]
): TodayVoiceAgendaCandidate[] {
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    taskType: item.taskType,
    status: item.status,
    timeLabel: formatAgendaTime(item.scheduledStart),
    subtitle: item.subtitle,
    completable:
      (item.kind === "schedule" || item.kind === "project_task") &&
      item.status !== "cancelled",
    reschedulable: item.kind === "schedule" && item.status !== "cancelled",
  }));
}

export const TODAY_VOICE_COMMAND_SYSTEM_PROMPT = `You classify spoken commands for a contractor's Daily Command Center (Today agenda).

Return a single JSON object with exactly these keys:
{
  "intent": "mark_done" | "reschedule" | "add_personal" | "unknown",
  "confidence": number between 0 and 1,
  "targetAgendaId": string | null,
  "title": string | null,
  "date": string | null,
  "time": string | null,
  "notes": string | null,
  "clarification": string | null
}

Rules:
- Use only the provided agenda candidates for matching. Prefer open (not completed) items.
- mark_done: user wants to complete/finish/check off an item. Set targetAgendaId to a completable candidate id. title/date/time may be null.
- reschedule: user wants to move a schedule item to a new date and/or time. Set targetAgendaId to a reschedulable candidate (kind schedule only). Put the new date as YYYY-MM-DD and time as HH:MM 24-hour local. If they only change time, keep today's dateKey. If all-day / no clock time, set time to null.
- add_personal: user wants a new personal task/reminder. Set title (required), date (default dateKey), time (HH:MM or null for all-day), optional notes. targetAgendaId must be null.
- unknown: cannot map confidently, or the request is unsupported (delete, call someone, pay invoice, etc.). Put a short clarification for the user.
- If multiple candidates match equally, intent may still be set but clarification must ask which one, and confidence should be <= 0.55 with targetAgendaId null.
- Do not invent agenda ids. targetAgendaId must be one of the candidate ids or null.
- Times like "3 PM" → "15:00". "noon" → "12:00". "7" in evening context → "19:00" when spoken as dinner/evening, else ask via clarification if ambiguous.
- Keep clarification short (one sentence) when used; otherwise null.`;

export function formatVoiceCommandSummary(input: {
  intent: TodayVoiceIntent;
  targetTitle?: string | null;
  title?: string | null;
  date?: string | null;
  time?: string | null;
  dateKey: string;
}): string {
  const when = formatVoiceWhen(input.date || input.dateKey, input.time);

  switch (input.intent) {
    case "mark_done":
      return input.targetTitle
        ? `Mark “${input.targetTitle}” as done.`
        : "Mark an agenda item as done.";
    case "reschedule":
      return input.targetTitle
        ? `Reschedule “${input.targetTitle}” to ${when}.`
        : `Reschedule to ${when}.`;
    case "add_personal":
      return input.title
        ? `Add personal task “${input.title}” for ${when}.`
        : `Add a personal task for ${when}.`;
    default:
      return "Could not understand that command.";
  }
}

function formatVoiceWhen(date: string, time: string | null | undefined): string {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : new Date().toISOString().slice(0, 10);
  const label = new Date(`${safeDate}T12:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (!time?.trim()) return `${label} (all day)`;
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date(safeDate + "T12:00:00");
  d.setHours(hh ?? 0, mm ?? 0, 0, 0);
  const timeLabel = d.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${label} at ${timeLabel}`;
}

export function normalizeVoiceCommandResult(
  raw: Partial<TodayVoiceCommandResult> | null | undefined
): TodayVoiceCommandResult {
  const intent =
    raw?.intent && isTodayVoiceIntent(raw.intent) ? raw.intent : "unknown";
  const confidence = clamp01(Number(raw?.confidence));
  return {
    intent,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    targetAgendaId: cleanString(raw?.targetAgendaId),
    title: cleanString(raw?.title),
    date: normalizeDate(raw?.date),
    time: normalizeTime(raw?.time),
    notes: cleanString(raw?.notes),
    clarification: cleanString(raw?.clarification),
  };
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDate(value: unknown): string | null {
  const text = cleanString(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return null;
}

function normalizeTime(value: unknown): string | null {
  const text = cleanString(value);
  if (!text) return null;
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
