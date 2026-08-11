import type { ScheduleItem } from "@/types/schedule-item";

/** Soft conflict window: ±60 minutes around scheduled_start (approved default). */
export const CONFLICT_PROXIMITY_MS = 60 * 60 * 1000;

export type ScheduleConflictCandidate = Pick<
  ScheduleItem,
  "id" | "title" | "scheduled_start" | "scheduled_end" | "all_day" | "status"
>;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
}

/**
 * Returns existing open items that conflict or sit near the proposed start time.
 * All-day items are ignored for proximity (they don't have a clock time).
 * Soft warning only — callers must still allow the user to proceed.
 */
export function findScheduleConflicts(input: {
  proposedStart: string | Date;
  proposedEnd?: string | Date | null;
  existing: ScheduleConflictCandidate[];
  /** Exclude this id when editing an existing row. */
  excludeId?: string | null;
  proximityMs?: number;
}): ScheduleConflictCandidate[] {
  const proximity = input.proximityMs ?? CONFLICT_PROXIMITY_MS;
  const proposedStart = new Date(input.proposedStart);
  if (Number.isNaN(proposedStart.getTime())) return [];

  const proposedEnd = input.proposedEnd
    ? new Date(input.proposedEnd)
    : new Date(proposedStart.getTime() + proximity);

  const dayStart = startOfLocalDay(proposedStart).getTime();
  const dayEnd = endOfLocalDay(proposedStart).getTime();
  const windowStart = proposedStart.getTime() - proximity;
  const windowEnd = Math.max(
    proposedEnd.getTime(),
    proposedStart.getTime() + proximity
  );

  return input.existing.filter((item) => {
    if (input.excludeId && item.id === input.excludeId) return false;
    if (item.status === "completed" || item.status === "cancelled") return false;
    if (item.all_day) return false;
    if (!item.scheduled_start) return false;

    const start = new Date(item.scheduled_start);
    if (Number.isNaN(start.getTime())) return false;
    const startMs = start.getTime();
    if (startMs < dayStart || startMs > dayEnd) return false;

    const endMs = item.scheduled_end
      ? new Date(item.scheduled_end).getTime()
      : startMs;

    // Interval overlap OR starts within proximity window of proposed start.
    const overlaps =
      startMs < proposedEnd.getTime() && endMs > proposedStart.getTime();
    const near =
      startMs >= windowStart && startMs <= windowEnd;

    return overlaps || near;
  });
}

export function formatConflictTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export type AgendaConflictPeer = {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  status: string;
};

/**
 * Soft conflicts among a set of already-loaded timed agenda items (± proximity).
 * Skips completed/cancelled and items without a clock start.
 */
export function findPeerConflicts(
  items: AgendaConflictPeer[],
  proximityMs: number = CONFLICT_PROXIMITY_MS
): Map<string, string[]> {
  const open = items.filter(
    (item) =>
      item.status !== "completed" &&
      item.status !== "cancelled" &&
      Boolean(item.scheduledStart)
  );

  const result = new Map<string, string[]>();

  for (const item of open) {
    const start = new Date(item.scheduledStart).getTime();
    if (Number.isNaN(start)) continue;
    const end = item.scheduledEnd
      ? new Date(item.scheduledEnd).getTime()
      : start + proximityMs;
    const windowStart = start - proximityMs;
    const windowEnd = Math.max(end, start + proximityMs);

    const peerTitles: string[] = [];
    for (const other of open) {
      if (other.id === item.id) continue;
      const otherStart = new Date(other.scheduledStart).getTime();
      if (Number.isNaN(otherStart)) continue;
      const otherEnd = other.scheduledEnd
        ? new Date(other.scheduledEnd).getTime()
        : otherStart;

      const overlaps = otherStart < end && otherEnd > start;
      const near = otherStart >= windowStart && otherStart <= windowEnd;
      if (overlaps || near) {
        peerTitles.push(other.title);
      }
    }

    if (peerTitles.length > 0) {
      result.set(item.id, peerTitles);
    }
  }

  return result;
}
