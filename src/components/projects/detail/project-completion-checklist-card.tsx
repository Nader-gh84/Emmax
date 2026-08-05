"use client";

import type { ProjectCompletionItem } from "@/lib/project-completion";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PendingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function ProjectCompletionChecklistCard({
  items,
  remainingCount,
  allComplete,
  projectClosed,
  closing,
  error,
  onCloseProject,
}: {
  items: ProjectCompletionItem[];
  remainingCount: number;
  allComplete: boolean;
  projectClosed: boolean;
  closing?: boolean;
  error?: string | null;
  onCloseProject: () => void;
}) {
  const canClose = allComplete && !projectClosed && !closing;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Project Completion Checklist
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {projectClosed
          ? "This project is closed and read-only."
          : "All items must be complete before you can close the project."}
      </p>

      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ${
                item.complete
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                  : "bg-amber-500/15 text-amber-200 ring-amber-500/30"
              }`}
              aria-hidden="true"
            >
              {item.complete ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <PendingIcon className="h-3.5 w-3.5" />
              )}
            </span>
            <span
              className={`text-sm leading-snug ${
                item.complete ? "text-slate-300" : "text-slate-200"
              }`}
            >
              <span className="sr-only">
                {item.complete ? "Complete: " : "Pending: "}
              </span>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      {projectClosed ? (
        <p className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-200">
          Project closed
        </p>
      ) : remainingCount > 0 ? (
        <p className="mt-4 text-sm text-slate-400">
          {remainingCount} step{remainingCount === 1 ? "" : "s"} remaining
          before this project can be closed.
        </p>
      ) : (
        <p className="mt-4 text-sm text-emerald-300/90">
          All steps complete — ready to close.
        </p>
      )}

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canClose}
        onClick={onCloseProject}
        className={`mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
          canClose
            ? "bg-accent text-white hover:bg-blue-600"
            : "cursor-not-allowed bg-white/5 text-slate-500 ring-1 ring-white/10"
        }`}
      >
        {closing ? "Closing…" : projectClosed ? "Project Closed" : "Close Project"}
      </button>
    </section>
  );
}
