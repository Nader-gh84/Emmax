"use client";

import {
  PRE_INVOICE_WORKFLOW_STEPS,
  type ProjectWorkflowStep,
} from "@/lib/pre-invoices";

export function WorkflowStepsBar({
  steps,
}: {
  steps: ProjectWorkflowStep[];
}) {
  return (
    <section className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4">
      <div className="flex min-w-max items-stretch gap-1">
        {PRE_INVOICE_WORKFLOW_STEPS.map((def, index) => {
          const step = steps.find((s) => s.id === def.id);
          const state = step?.state ?? "locked";
          const isLast = index === PRE_INVOICE_WORKFLOW_STEPS.length - 1;
          return (
            <div key={def.id} className="flex items-center gap-1">
              <div
                className={`w-28 rounded-xl px-2 py-2 text-center ${
                  state === "completed"
                    ? "bg-emerald-500/15 ring-1 ring-emerald-500/30"
                    : state === "active"
                      ? "bg-accent/15 ring-1 ring-accent/40"
                      : "bg-white/[0.02] ring-1 ring-white/5"
                }`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-wide ${
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
                  className={`mt-1 text-[11px] font-semibold leading-tight ${
                    state === "locked" ? "text-slate-600" : "text-slate-200"
                  }`}
                >
                  {def.title}
                </p>
              </div>
              {!isLast ? (
                <span
                  className={`h-px w-3 ${
                    state === "completed" ? "bg-emerald-500/50" : "bg-white/10"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
