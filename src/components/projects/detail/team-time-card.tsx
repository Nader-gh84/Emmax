"use client";

import { useEffect, useMemo, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import { ensureLabourInvoiceForTimeEntry } from "@/lib/labour-invoice";
import { logProjectActivity } from "@/lib/project-activity";
import { createClient } from "@/lib/supabase";
import { getUserInitials } from "@/lib/user-display";
import type { Employee } from "@/types/employee";
import type { TimeEntry } from "@/types/project-operations";
import { formatProjectDate, formatProjectMoney } from "@/types/project";

const AVATAR_COLORS = [
  "bg-sky-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-cyan-700",
  "bg-violet-600",
  "bg-emerald-700",
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0];
}

export function TeamTimeCard({
  projectId,
  assignedEmployees,
  initialEntries,
  onEntriesChange,
  readOnly = false,
}: {
  projectId: string;
  assignedEmployees: Employee[];
  initialEntries: TimeEntry[];
  onEntriesChange?: (entries: TimeEntry[]) => void;
  readOnly?: boolean;
}) {
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);

  function syncEntries(next: TimeEntry[]) {
    setEntries(next);
    onEntriesChange?.(next);
  }
  const [modalOpen, setModalOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(
    assignedEmployees[0]?.id ?? ""
  );
  const [hours, setHours] = useState("");
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTimeDetails, setShowTimeDetails] = useState(false);

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
    if (readOnly) return;
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
        payment_status: "unpaid",
        entry_source: "actual",
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
      payment_status:
        (data as TimeEntry).payment_status === "paid" ? "paid" : "unpaid",
      entry_source: "actual",
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

    // Best-effort: attach to pay-period labour invoice (hourly + rate required).
    await ensureLabourInvoiceForTimeEntry(supabase, created.id);

    syncEntries([created, ...entries]);

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
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTimeDetails((open) => !open)}
            className="text-xs font-semibold text-accent transition hover:text-blue-400"
          >
            {showTimeDetails ? "Hide Time Details" : "View Time Details"}
          </button>
          {!readOnly ? (
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
          ) : null}
        </div>
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
          {perEmployee.map(({ employee, hours: hoursSum, cost }) => {
            const initials = getUserInitials(employee.full_name, "");
            return (
              <li
                key={employee.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColor(
                      employee.full_name
                    )}`}
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      {employee.full_name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {employee.role?.trim() || "No role"} · {hoursSum.toFixed(1)}h
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-200">
                  {formatProjectMoney(cost)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {showTimeDetails ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time entry details
          </p>
          {entries.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No time logged yet.</p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-2 border-b border-white/5 pb-2 text-sm last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200">
                      {entry.employees?.full_name ||
                        assignedEmployees.find((e) => e.id === entry.employee_id)
                          ?.full_name ||
                        "Employee"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatProjectDate(entry.entry_date)}
                      {entry.notes ? ` · ${entry.notes}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-slate-300">
                    {Number(entry.hours).toFixed(1)}h
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

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

      {modalOpen && !readOnly ? (
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
