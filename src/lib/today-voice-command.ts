import type { TodayAgendaItem } from "@/lib/today-agenda";
import { formatAgendaTime } from "@/lib/today-agenda";
import {
  isAgendaPriority,
  isScheduleTaskType,
  scheduleTaskTypeLabel,
  type AgendaPriority,
  type ScheduleTaskType,
} from "@/types/schedule-item";

export const TODAY_VOICE_INTENTS = [
  "mark_done",
  "reschedule",
  "add_item",
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

export type TodayVoiceProjectCandidate = {
  id: string;
  projectName: string;
  customerId: string | null;
  customerName: string | null;
  status: string;
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
  /** For add_item — inferred type (defaults to personal when unset). */
  taskType: ScheduleTaskType | null;
  projectId: string | null;
  /** Spoken/typed project name hint when id not resolved. */
  projectQuery: string | null;
  /**
   * True when the utterance referenced a job/project but matching is
   * ambiguous or failed — UI must clarify; do not silently create personal.
   */
  needsProjectClarification: boolean;
  priority: AgendaPriority | null;
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

export function toVoiceProjectCandidates(
  projects: TodayVoiceProjectCandidate[]
): TodayVoiceProjectCandidate[] {
  return projects.slice(0, 80).map((p) => ({
    id: p.id,
    projectName: p.projectName,
    customerId: p.customerId,
    customerName: p.customerName,
    status: p.status,
  }));
}

export const TODAY_VOICE_COMMAND_SYSTEM_PROMPT = `You classify spoken or typed commands for a contractor's Daily Command Center (Today agenda).

Return a single JSON object with exactly these keys:
{
  "intent": "mark_done" | "reschedule" | "add_item" | "unknown",
  "confidence": number between 0 and 1,
  "targetAgendaId": string | null,
  "title": string | null,
  "date": string | null,
  "time": string | null,
  "notes": string | null,
  "clarification": string | null,
  "taskType": "project_task" | "pickup" | "delivery" | "site_visit" | "call" | "inspection" | "payment_reminder" | "personal" | "other" | null,
  "projectId": string | null,
  "projectQuery": string | null,
  "needsProjectClarification": boolean,
  "priority": "high" | "medium" | "low" | null
}

Rules:
- Use only the provided agenda candidates for matching existing items. Prefer open (not completed) items.
- Use only the provided project candidates when linking a new item to a job. projectId must be one of those ids or null. Do not invent project ids.
- mark_done: user wants to complete/finish/check off an item. Set targetAgendaId to a completable candidate id. Other add fields may be null. needsProjectClarification false.
- reschedule: user wants to move a schedule item to a new date and/or time. Set targetAgendaId to a reschedulable candidate (kind schedule only). Put the new date as YYYY-MM-DD and time as HH:MM 24-hour local. If they only change time, keep today's dateKey. If all-day / no clock time, set time to null. needsProjectClarification false.
- add_item: user wants a NEW agenda item (task, site visit, call, pickup, personal reminder, etc.).
  - title is required (short actionable title; do not paste the whole utterance).
  - Infer taskType from wording (e.g. "site visit" → site_visit, "call" → call, "pickup" → pickup, "remind me" / no work context → personal). Default personal only when no work/project context.
  - date defaults to dateKey; time HH:MM or null for all-day; optional notes; optional priority (default null → medium).
  - targetAgendaId must be null.
  - Project linking:
    - If the user names a job/project/customer site ("for Kitchen remodel", "at the Smith job"), try to match project candidates by projectName (and customerName as secondary).
    - Exact or clear unique match → set projectId, projectQuery to the spoken name, needsProjectClarification false. Prefer taskType site_visit/call/inspection/other over personal when a project is linked.
    - Zero matches or multiple plausible matches → projectId null, set projectQuery to the spoken name, needsProjectClarification TRUE, confidence <= 0.55, and clarification asking which project. NEVER silently invent a personal-only item when a project was clearly referenced.
    - If the user clearly wants a personal/errand item with no job reference → taskType personal, projectId null, needsProjectClarification false.
- unknown: cannot map confidently, or the request is unsupported (delete, call someone on the phone, pay invoice, etc.). Put a short clarification for the user. needsProjectClarification false.
- If multiple agenda candidates match equally for mark_done/reschedule, clarification must ask which one, confidence <= 0.55, targetAgendaId null.
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
  taskType?: ScheduleTaskType | null;
  projectName?: string | null;
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
    case "add_item": {
      const typeLabel = scheduleTaskTypeLabel(input.taskType || "personal");
      const projectBit = input.projectName
        ? ` on “${input.projectName}”`
        : "";
      return input.title
        ? `Add ${typeLabel.toLowerCase()} “${input.title}”${projectBit} for ${when}.`
        : `Add a ${typeLabel.toLowerCase()}${projectBit} for ${when}.`;
    }
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
  raw: Partial<TodayVoiceCommandResult> & {
    intent?: string | null;
    task_type?: string | null;
    project_id?: string | null;
    project_query?: string | null;
    needs_project_clarification?: boolean | null;
  } | null | undefined
): TodayVoiceCommandResult {
  let intentRaw: string =
    typeof raw?.intent === "string" ? raw.intent : "unknown";
  if (intentRaw === "add_personal") intentRaw = "add_item";
  const intent: TodayVoiceIntent = isTodayVoiceIntent(intentRaw)
    ? intentRaw
    : "unknown";

  const confidence = clamp01(Number(raw?.confidence));

  const taskTypeRaw =
    cleanString(raw?.taskType) ?? cleanString(raw?.task_type);
  const taskType =
    taskTypeRaw && isScheduleTaskType(taskTypeRaw) ? taskTypeRaw : null;

  const priorityRaw = cleanString(raw?.priority);
  const priority =
    priorityRaw && isAgendaPriority(priorityRaw) ? priorityRaw : null;

  const needsProjectClarification = Boolean(
    raw?.needsProjectClarification ?? raw?.needs_project_clarification
  );

  return {
    intent,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    targetAgendaId: cleanString(raw?.targetAgendaId),
    title: cleanString(raw?.title),
    date: normalizeDate(raw?.date),
    time: normalizeTime(raw?.time),
    notes: cleanString(raw?.notes),
    clarification: cleanString(raw?.clarification),
    taskType: intent === "add_item" ? taskType || "personal" : taskType,
    projectId: cleanString(raw?.projectId) ?? cleanString(raw?.project_id),
    projectQuery:
      cleanString(raw?.projectQuery) ?? cleanString(raw?.project_query),
    needsProjectClarification:
      intent === "add_item" ? needsProjectClarification : false,
    priority,
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
