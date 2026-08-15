"use client";

import { formatAgendaTime, type TodayAgendaItem } from "@/lib/today-agenda";

export type TimelineHourSlot = {
  hour: number;
  label: string;
  items: TodayAgendaItem[];
};

function hourInTimeZone(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

function formatHourLabel(hour: number, timeZone: string): string {
  const utc = Date.UTC(2020, 0, 1, hour, 0, 0);
  return new Date(utc).toLocaleTimeString("en-CA", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Build hour slots covering timed items (defaults 7–20, expands as needed). */
export function buildTimelineSlots(
  items: TodayAgendaItem[],
  timeZone: string
): {
  allDay: TodayAgendaItem[];
  slots: TimelineHourSlot[];
  nowHour: number | null;
} {
  const allDay = items.filter(
    (item) => item.allDay || !item.scheduledStart
  );
  const timed = items.filter(
    (item) => !item.allDay && Boolean(item.scheduledStart)
  );

  let minHour = 7;
  let maxHour = 19;
  for (const item of timed) {
    const hour = hourInTimeZone(item.scheduledStart!, timeZone);
    minHour = Math.min(minHour, hour);
    maxHour = Math.max(maxHour, hour);
  }
  minHour = Math.max(0, minHour);
  maxHour = Math.min(23, Math.max(maxHour, minHour));

  const byHour = new Map<number, TodayAgendaItem[]>();
  for (let h = minHour; h <= maxHour; h += 1) {
    byHour.set(h, []);
  }
  for (const item of timed) {
    const hour = hourInTimeZone(item.scheduledStart!, timeZone);
    const bucket = byHour.get(hour) ?? [];
    bucket.push(item);
    byHour.set(hour, bucket);
  }

  const slots: TimelineHourSlot[] = [];
  for (let h = minHour; h <= maxHour; h += 1) {
    const hourItems = byHour.get(h) ?? [];
    hourItems.sort((a, b) =>
      (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? "")
    );
    slots.push({
      hour: h,
      label: formatHourLabel(h, timeZone),
      items: hourItems,
    });
  }

  const nowHour = hourInTimeZone(new Date().toISOString(), timeZone);

  return {
    allDay,
    slots,
    nowHour:
      nowHour >= minHour && nowHour <= maxHour ? nowHour : null,
  };
}

export function TimelineNowMarker({ label }: { label?: string }) {
  return (
    <div className="relative z-10 -ml-1 flex items-center gap-2 py-1">
      <span className="h-2.5 w-2.5 rounded-full bg-red-400 shadow shadow-red-400/40" />
      <span className="h-px flex-1 bg-red-400/70" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-red-300">
        {label ?? "Now"}
      </span>
    </div>
  );
}

export function TimelineHourLabel({
  label,
  empty,
}: {
  label: string;
  empty?: boolean;
}) {
  return (
    <div
      className={`w-14 shrink-0 pt-1 text-right text-xs font-semibold tabular-nums ${
        empty ? "text-mute opacity-70" : "text-mute"
      }`}
    >
      {label}
    </div>
  );
}

export { formatAgendaTime };
