"use client";

import { useEffect, useMemo, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import { logProjectActivity } from "@/lib/project-activity";
import { createClient } from "@/lib/supabase";
import type { Employee } from "@/types/employee";
import {
  computeTaskCompletionPercent,
  type ProjectTask,
} from "@/types/project-operations";
import { formatProjectDate } from "@/types/project";

type EmployeeOption = Pick<Employee, "id" | "full_name">;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function TasksOverviewCard({
  projectId,
  initialTasks,
  employees,
  onTasksChange,
}: {
  projectId: string;
  initialTasks: ProjectTask[];
  employees: EmployeeOption[];
  onTasksChange?: (tasks: ProjectTask[]) => void;
}) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  function syncTasks(next: ProjectTask[]) {
    setTasks(next);
    onTasksChange?.(next);
  }

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === "completed").length,
    [tasks]
  );
  const percent = computeTaskCompletionPercent(tasks);

  function employeeName(task: ProjectTask): string {
    if (task.employees?.full_name) return task.employees.full_name;
    const match = employees.find((e) => e.id === task.assigned_employee_id);
    return match?.full_name ?? "Unassigned";
  }

  async function toggleCompleted(task: ProjectTask) {
    const nextCompleted = task.status !== "completed";
    setTogglingId(task.id);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in.");
      setTogglingId(null);
      return;
    }

    const payload = {
      status: nextCompleted ? ("completed" as const) : ("todo" as const),
      completed_at: nextCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", task.id)
      .eq("project_id", projectId);

    if (updateError) {
      setError("Failed to update task.");
      setTogglingId(null);
      return;
    }

    setTasks((current) => {
      const next = current.map((row) =>
        row.id === task.id ? { ...row, ...payload } : row
      );
      onTasksChange?.(next);
      return next;
    });

    if (nextCompleted) {
      await logProjectActivity(supabase, {
        userId: user.id,
        projectId,
        activityType: "task_completed",
        description: `Completed task “${task.title.trim()}”`,
      });
    }

    setTogglingId(null);
  }

  async function handleDelete(task: ProjectTask) {
    setDeletingId(task.id);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("project_id", projectId);

    if (deleteError) {
      setError("Failed to delete task.");
      setDeletingId(null);
      return;
    }

    setTasks((current) => {
      const next = current.filter((row) => row.id !== task.id);
      onTasksChange?.(next);
      return next;
    });
    setDeletingId(null);
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
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

    const assignee = assigneeId
      ? employees.find((e) => e.id === assigneeId) ?? null
      : null;

    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        project_id: projectId,
        title: trimmed,
        assigned_employee_id: assignee?.id ?? null,
        status: "todo",
        due_date: dueDate || null,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      setError("Failed to add task.");
      setBusy(false);
      return;
    }

    const created: ProjectTask = {
      ...(data as ProjectTask),
      employees: assignee
        ? { id: assignee.id, full_name: assignee.full_name, role: null }
        : null,
    };

    setTasks((current) => {
      const next = [...current, created];
      onTasksChange?.(next);
      return next;
    });

    await logProjectActivity(supabase, {
      userId: user.id,
      projectId,
      activityType: "task_added",
      description: `Added task “${trimmed}”`,
    });

    setTitle("");
    setAssigneeId("");
    setDueDate("");
    setModalOpen(false);
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Tasks Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {completedCount} of {tasks.length} completed · {percent}%
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className={`${touchBtnPrimary} px-4 text-sm`}
        >
          + Add Task
        </button>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No tasks yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {tasks.map((task) => {
            const done = task.status === "completed";
            return (
              <li
                key={task.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
              >
                <input
                  type="checkbox"
                  checked={done}
                  disabled={togglingId === task.id}
                  onChange={() => void toggleCompleted(task)}
                  aria-label={`Mark “${task.title}” ${done ? "incomplete" : "complete"}`}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-accent focus:ring-accent"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      done ? "text-slate-500 line-through" : "text-white"
                    }`}
                  >
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {employeeName(task)}
                    {task.due_date
                      ? ` · Due ${formatProjectDate(task.due_date)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(task)}
                  disabled={deletingId === task.id}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-white/10 hover:text-red-300 disabled:opacity-40"
                  aria-label={`Delete task “${task.title}”`}
                >
                  {deletingId === task.id ? "…" : "Delete"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

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
            aria-labelledby="add-task-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-white/10 bg-navy p-6 shadow-xl"
          >
            <h3 id="add-task-title" className="text-xl font-semibold text-white">
              Add Task
            </h3>
            <form onSubmit={(e) => void handleAdd(e)} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="task-title"
                  className="block text-sm font-medium text-slate-300"
                >
                  Title <span className="text-accent">*</span>
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label
                  htmlFor="task-assignee"
                  className="block text-sm font-medium text-slate-300"
                >
                  Assignee
                </label>
                <select
                  id="task-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                >
                  <option value="">Unassigned</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="task-due-date"
                  className="block text-sm font-medium text-slate-300"
                >
                  Due date
                </label>
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  min={todayIsoDate()}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                />
              </div>
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
                  {busy ? "Saving…" : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
