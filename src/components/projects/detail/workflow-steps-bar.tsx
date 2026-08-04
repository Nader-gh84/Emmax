"use client";

import {
  PRE_INVOICE_WORKFLOW_STEPS,
  type ProjectWorkflowStep,
  type WorkflowStepId,
} from "@/lib/pre-invoices";

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function IconMic({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function IconDocument({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function IconHandshake({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
      />
    </svg>
  );
}

function IconCube({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function IconPackage({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

const ACTIVE_ICONS: Record<
  WorkflowStepId,
  (props: { className?: string }) => JSX.Element
> = {
  voice_materials: IconMic,
  send_supplier: IconSend,
  upload_prices: IconUpload,
  create_quote: IconDocument,
  send_customer: IconMail,
  customer_accept: IconHandshake,
  order_materials: IconCube,
  materials_ready: IconPackage,
  schedule_project: IconCalendar,
  start_project: IconPlay,
};

function statusText(
  state: ProjectWorkflowStep["state"],
  completedDate?: string | null
): string {
  if (state === "completed") {
    return completedDate ? completedDate : "Done";
  }
  // Avoid labeling the *current* step as "In Progress" — that reads as if the
  // project already started (especially for Step 10: Start Project).
  if (state === "active") return "Current";
  return "Locked";
}

export function WorkflowStepsBar({
  steps,
}: {
  steps: ProjectWorkflowStep[];
}) {
  return (
    <section className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-5 sm:px-4">
      <div className="flex min-w-max items-start justify-between gap-0">
        {PRE_INVOICE_WORKFLOW_STEPS.map((def, index) => {
          const step = steps.find((s) => s.id === def.id);
          const state = step?.state ?? "locked";
          const isLast = index === PRE_INVOICE_WORKFLOW_STEPS.length - 1;
          const ActiveIcon = ACTIVE_ICONS[def.id];
          const prevCompleted =
            index > 0 &&
            (steps.find(
              (s) => s.id === PRE_INVOICE_WORKFLOW_STEPS[index - 1]?.id
            )?.state === "completed" ||
              state === "completed" ||
              state === "active");

          return (
            <div key={def.id} className="flex items-start">
              <div className="flex w-[4.75rem] flex-col items-center text-center sm:w-[5.25rem]">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ring-2 sm:h-11 sm:w-11 ${
                    state === "completed"
                      ? "bg-emerald-500 text-white ring-emerald-400/40"
                      : state === "active"
                        ? "bg-accent text-white ring-accent/50 shadow-lg shadow-accent/25"
                        : "bg-white/[0.06] text-slate-500 ring-white/10"
                  }`}
                  aria-current={state === "active" ? "step" : undefined}
                >
                  {state === "completed" ? (
                    <IconCheck className="h-5 w-5" />
                  ) : state === "active" ? (
                    <ActiveIcon className="h-5 w-5" />
                  ) : (
                    <IconLock className="h-4 w-4" />
                  )}
                </div>
                <p
                  className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${
                    state === "completed"
                      ? "text-emerald-300"
                      : state === "active"
                        ? "text-accent"
                        : "text-slate-600"
                  }`}
                >
                  Step {def.number}
                </p>
                <p
                  className={`mt-0.5 text-[11px] font-semibold leading-tight ${
                    state === "locked" ? "text-slate-600" : "text-slate-200"
                  }`}
                >
                  {def.title}
                </p>
                <p
                  className={`mt-0.5 text-[10px] ${
                    state === "completed"
                      ? "text-emerald-400/80"
                      : state === "active"
                        ? "text-accent/80"
                        : "text-slate-600"
                  }`}
                >
                  {statusText(state, step?.completedDate)}
                </p>
              </div>
              {!isLast ? (
                <div
                  className="mt-4 flex w-3 shrink-0 items-center justify-center sm:mt-5 sm:w-4"
                  aria-hidden="true"
                >
                  <IconChevronRight
                    className={`h-3.5 w-3.5 ${
                      state === "completed" || prevCompleted
                        ? "text-emerald-500/60"
                        : "text-white/20"
                    }`}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
