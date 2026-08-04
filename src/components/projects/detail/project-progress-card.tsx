"use client";

import { computeProgressDates } from "@/types/project-operations";
import { formatProjectDate } from "@/types/project";

function ProgressDonut({
  percent,
  color = "#3B82F6",
  track = "rgba(255,255,255,0.08)",
  size = 112,
  stroke = 10,
}: {
  percent: number;
  color?: string;
  track?: string;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-bold text-white">{clamped}%</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Progress
        </span>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-200">{value}</dd>
    </div>
  );
}

function formatDays(value: number | null): string {
  if (value == null) return "—";
  return String(value);
}

export function ProjectProgressCard({
  completionPercent,
  startDate,
  endDate,
  startDateConfirmed,
}: {
  completionPercent: number;
  startDate: string | null;
  endDate: string | null;
  startDateConfirmed: boolean;
}) {
  const effectiveStart = startDateConfirmed ? startDate : null;
  const progress = computeProgressDates({
    startDate: effectiveStart,
    endDate,
  });
  const clamped = Math.max(0, Math.min(100, Math.round(completionPercent)));

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Project Progress
      </h2>

      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <ProgressDonut percent={clamped} />
        <dl className="w-full space-y-2">
          <StatRow
            label="Start"
            value={
              startDateConfirmed
                ? formatProjectDate(startDate)
                : "Not confirmed"
            }
          />
          <StatRow label="End" value={formatProjectDate(endDate)} />
          <StatRow label="Total Days" value={formatDays(progress.totalDays)} />
          <StatRow
            label="Days Passed"
            value={formatDays(progress.daysPassed)}
          />
          <StatRow
            label="Remaining"
            value={formatDays(progress.daysRemaining)}
          />
          <StatRow
            label="Working Days Left"
            value={formatDays(progress.workingDaysLeft)}
          />
        </dl>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-slate-500">
          <span>Completion</span>
          <span>{clamped}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    </section>
  );
}
