"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import { createClient } from "@/lib/supabase";
import type { Employee } from "@/types/employee";

export function ProjectAssignedEmployees({
  projectId,
}: {
  projectId: string;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadFailedMissingTable, setLoadFailedMissingTable] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoadFailedMissingTable(false);
    const supabase = createClient();

    const [{ data: employeeRows, error: employeesError }, { data: assignmentRows, error: assignmentsError }] =
      await Promise.all([
        supabase
          .from("employees")
          .select("*")
          .order("full_name", { ascending: true }),
        supabase
          .from("project_employees")
          .select("employee_id")
          .eq("project_id", projectId),
      ]);

    if (employeesError || assignmentsError) {
      const message =
        employeesError?.message || assignmentsError?.message || "";
      const missing =
        employeesError?.code === "42P01" ||
        assignmentsError?.code === "42P01" ||
        employeesError?.code === "PGRST205" ||
        assignmentsError?.code === "PGRST205" ||
        message.includes("employees") ||
        message.includes("project_employees");
      setLoadFailedMissingTable(missing);
      setError(
        missing
          ? "Run migration 030_employees_and_project_assignments.sql in Supabase to enable assignments."
          : "Failed to load assigned employees."
      );
      setEmployees([]);
      setSelectedIds([]);
      return;
    }

    setEmployees((employeeRows as Employee[]) ?? []);
    setSelectedIds(
      ((assignmentRows as { employee_id: string }[] | null) ?? []).map(
        (row) => row.employee_id
      )
    );
  }, [projectId]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    }
    void init();
  }, [load]);

  function toggleEmployee(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
    setSuccess(null);
    setError(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/employees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: selectedIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save assignments.");
      }
      setSelectedIds(
        Array.isArray(data.employeeIds)
          ? (data.employeeIds as string[])
          : selectedIds
      );
      setSuccess("Assigned employees saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save assignments."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Assigned Employees
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            These crew members are emailed when you start this project.
          </p>
        </div>
        <Link
          href="/dashboard/settings?section=employees"
          className="shrink-0 text-xs font-semibold text-accent hover:text-blue-400"
        >
          Manage
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Loading employees…</p>
      ) : loadFailedMissingTable ? (
        <p className="mt-4 text-sm text-amber-200/90">{error}</p>
      ) : employees.length === 0 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-400">
          No employees registered yet.{" "}
          <Link
            href="/dashboard/settings?section=employees"
            className="font-semibold text-accent hover:text-blue-400"
          >
            Add employees in Advance Setting
          </Link>
          .
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {employees.map((employee) => {
            const checked = selectedIds.includes(employee.id);
            return (
              <li key={employee.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 transition hover:bg-white/[0.04]">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEmployee(employee.id)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-accent focus:ring-accent"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white">
                      {employee.full_name}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {[employee.role, employee.email]
                        .filter(Boolean)
                        .join(" · ") || "No email on file"}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {error && !loadFailedMissingTable ? (
        <p className="mt-3 text-sm text-red-300">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-3 text-sm text-emerald-300">{success}</p>
      ) : null}

      {employees.length > 0 && !loadFailedMissingTable ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className={`${touchBtnPrimary} px-4 text-sm disabled:opacity-40`}
          >
            {isSaving ? "Saving…" : "Save assignments"}
          </button>
        </div>
      ) : null}

      {employees.length === 0 && !isLoading && !loadFailedMissingTable ? (
        <div className="mt-3">
          <Link
            href="/dashboard/settings?section=employees"
            className={`${touchBtnSecondary} inline-flex px-4 text-sm`}
          >
            Open Employees settings
          </Link>
        </div>
      ) : null}
    </section>
  );
}
