"use client";

import { useEffect, useMemo, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import { logProjectActivity } from "@/lib/project-activity";
import { createClient } from "@/lib/supabase";
import type { Employee } from "@/types/employee";
import type { TimeEntry } from "@/types/project-operations";
import { formatProjectDate, formatProjectMoney } from "@/types/project";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function TeamTimeCard({
  projectId,
  assignedEmployees,
  initialEntries,
}: {
  projectId: string;
  assignedEmployees: Employee[];
  initialEntries: TimeEntry[];
}) {
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [modalOpen, setModalOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(
    assignedEmployees[0]?.id ?? ""
  );
  const [hours, setHours] = useState("");
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  useEffect(() => {
    if (
      assignedEmployees.length > 0 &&
      !assignedEmployees.some((e) => e.id === employeeId)
    ) {
      setEmployeeId(assignedEmployees[0].id);
    }
  }, [assignedEmployees, employeeId]);

  const perEmployee = useMemo(() => {
    return assignedEmployees.map((employee) => {
      const hoursSum = entries
        .filter((entry) => entry.employee_id === employee.id)
        .reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
      const rate = Number(employee.pay_rate) || 0;
      return {
        employee,
        hours: hoursSum,
        cost: hoursSum * rate,
      };
    });
  }, [assignedEmployees, entries]);

  const totalHours = perEmployee.reduce((sum, row) => sum + row.hours, 0);
  const totalCost = perEmployee.reduce((sum, row) => sum + row.cost, 0);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const parsedHours = Number.parseFloat(hours);
    if (!employeeId) {
      setError("Select an employee.");
      return;
    }
    if (Number.isNaN(parsedHours) || parsedHours <= 0) {
      setError("Enter valid hours greater than zero.");
      return;
    }
    if (!entryDate) {
      setError("Entry date is required.");
      return;
    }

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in.");
      setBusy(false);
      return;
    }

    const employee = assignedEmployees.find((e) => e.id === employeeId);

    const { data, error: insertError } = await supabase
      .from("time_entries")
      .insert({
        user_id: user.id,
        project_id: projectId,
        employee_id: employeeId,
        hours: parsedHours,
        entry_date: entryDate,
        notes: notes.trim() || null,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      setError("Failed to log time.");
      setBusy(false);
      return;
    }

    const created: TimeEntry = {
      ...(data as TimeEntry),
      employees: employee
        ? {
            id: employee.id,
            full_name: employee.full_name,
            role: employee.role,
            pay_rate: employee.pay_rate,
            pay_type: employee.pay_type,
          }
        : null,
    };

    setEntries((current) => [created, ...current]);

    await logProjectActivity(supabase, {
      userId: user.id,
      projectId,
      activityType: "time_logged",
      description: `Logged ${parsedHours}h for ${employee?.full_name ?? "employee"}`,
    });

    setHours("");
    setNotes("");
    setEntryDate(todayIsoDate());
    setModalOpen(false);
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Team & Time
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Hours and labor cost by assigned crew
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          disabled={assignedEmployees.length === 0}
          className={`${touchBtnPrimary} px-4 text-sm disabled:opacity-40`}
        >
          + Log Time
        </button>
      </div>

      {error && !modalOpen ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {assignedEmployees.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No employees assigned to this project yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {perEmployee.map(({ employee, hours: hoursSum, cost }) => (
            <li
              key={employee.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  {employee.full_name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {employee.role?.trim() || "No role"} · {hoursSum.toFixed(1)}h
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-200">
                {formatProjectMoney(cost)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
        <div className="flex justify-between text-slate-400">
          <dt>Total Hours</dt>
          <dd className="font-medium text-slate-200">
            {totalHours.toFixed(1)}h
          </dd>
        </div>
        <div className="flex justify-between text-base font-semibold text-white">
          <dt>Total Labor Cost</dt>
          <dd>{formatProjectMoney(totalCost)}</dd>
        </div>
      </dl>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={() => {
              if (!busy) setModalOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-time-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-white/10 bg-navy p-6 shadow-xl"
          >
            <h3 id="log-time-title" className="text-xl font-semibold text-white">
              Log Time
            </h3>
            {error ? (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}
            <form onSubmit={(e) => void handleAdd(e)} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="time-employee"
                  className="block text-sm font-medium text-slate-300"
                >
                  Employee <span className="text-accent">*</span>
                </label>
                <select
                  id="time-employee"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                  required
                >
                  {assignedEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="time-hours"
                  className="block text-sm font-medium text-slate-300"
                >
                  Hours <span className="text-accent">*</span>
                </label>
                <input
                  id="time-hours"
                  type="number"
                  inputMode="decimal"
                  min="0.25"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="time-entry-date"
                  className="block text-sm font-medium text-slate-300"
                >
                  Date <span className="text-accent">*</span>
                </label>
                <input
                  id="time-entry-date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="time-notes"
                  className="block text-sm font-medium text-slate-300"
                >
                  Notes
                </label>
                <textarea
                  id="time-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${touchTextarea} mt-1.5 min-h-[88px]`}
                  placeholder="Optional notes"
                />
              </div>
              <p className="text-xs text-slate-500">
                Entry dated {formatProjectDate(entryDate || null)}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setModalOpen(false)}
                  className={`${touchBtnSecondary} w-full sm:w-auto`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className={`${touchBtnPrimary} w-full sm:w-auto`}
                >
                  {busy ? "Saving…" : "Log Time"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
