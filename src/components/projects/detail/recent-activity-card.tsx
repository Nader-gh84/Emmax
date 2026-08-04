"use client";

import { useState } from "react";
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
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? activities : activities.slice(0, 5);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Recent Activity
        </h2>
        {activities.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll((open) => !open)}
            className="text-xs font-semibold text-accent transition hover:text-blue-400"
          >
            {showAll && activities.length > 5 ? "Show Less" : "View All"}
          </button>
        ) : null}
      </div>

      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No activity yet</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((activity) => (
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
