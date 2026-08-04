"use client";

import type { ProjectActivity } from "@/types/project-operations";

function formatActivityTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecentActivityCard({
  activities,
}: {
  activities: ProjectActivity[];
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Recent Activity
      </h2>

      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No activity yet</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="border-b border-white/5 pb-3 last:border-0 last:pb-0"
            >
              <p className="text-xs text-slate-500">
                {formatActivityTimestamp(activity.created_at)}
              </p>
              <p className="mt-1 text-sm text-slate-200">
                {activity.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
