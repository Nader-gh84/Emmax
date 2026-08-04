"use client";

import { touchBtnPrimary } from "@/components/quotes/ui";

export function EmployeesEmptyState({
  onAddEmployee,
}: {
  onAddEmployee: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
      <h3 className="text-lg font-semibold text-white">No employees yet</h3>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        Add your crew so you can assign them to projects and notify them when
        work starts.
      </p>
      <button
        type="button"
        onClick={onAddEmployee}
        className={`${touchBtnPrimary} mt-6`}
      >
        + Add Employee
      </button>
    </div>
  );
}
