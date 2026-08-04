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
import type { ProjectExpense } from "@/types/project-operations";
import { formatProjectDate, formatProjectMoney } from "@/types/project";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpensesCard({
  projectId,
  initialExpenses,
  onExpensesChange,
}: {
  projectId: string;
  initialExpenses: ProjectExpense[];
  onExpensesChange?: (expenses: ProjectExpense[]) => void;
}) {
  const [expenses, setExpenses] = useState<ProjectExpense[]>(initialExpenses);
  const [modalOpen, setModalOpen] = useState(false);
  const [expenseDate, setExpenseDate] = useState(todayIsoDate());
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  function syncExpenses(next: ProjectExpense[]) {
    setExpenses(next);
    onExpensesChange?.(next);
  }

  const total = useMemo(
    () => expenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [expenses]
  );

  async function handleDelete(expense: ProjectExpense) {
    setDeletingId(expense.id);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("project_expenses")
      .delete()
      .eq("id", expense.id)
      .eq("project_id", projectId);

    if (deleteError) {
      setError("Failed to delete expense.");
      setDeletingId(null);
      return;
    }

    syncExpenses(expenses.filter((row) => row.id !== expense.id));
    setDeletingId(null);
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const parsedAmount = Number.parseFloat(amount);
    if (!expenseDate) {
      setError("Date is required.");
      return;
    }
    if (!storeName.trim()) {
      setError("Store name is required.");
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError("Enter a valid amount.");
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

    const { data, error: insertError } = await supabase
      .from("project_expenses")
      .insert({
        user_id: user.id,
        project_id: projectId,
        expense_date: expenseDate,
        store_name: storeName.trim(),
        description: description.trim(),
        amount: parsedAmount,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      setError("Failed to add expense.");
      setBusy(false);
      return;
    }

    const created = data as ProjectExpense;
    syncExpenses([created, ...expenses]);

    await logProjectActivity(supabase, {
      userId: user.id,
      projectId,
      activityType: "expense_added",
      description: `Added expense at ${created.store_name} (${formatProjectMoney(parsedAmount)})`,
    });

    setStoreName("");
    setDescription("");
    setAmount("");
    setExpenseDate(todayIsoDate());
    setModalOpen(false);
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Extra Purchases
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Running total {formatProjectMoney(total)}
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
          + Add Expense
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {expenses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No expenses yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  {expense.store_name || "Store"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {expense.description || "—"} ·{" "}
                  {formatProjectDate(expense.expense_date)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {formatProjectMoney(Number(expense.amount) || 0)}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(expense)}
                  disabled={deletingId === expense.id}
                  className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-white/10 hover:text-red-300 disabled:opacity-40"
                  aria-label={`Delete expense from ${expense.store_name}`}
                >
                  {deletingId === expense.id ? "…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-sm font-semibold text-white">
        <span>Total</span>
        <span>{formatProjectMoney(total)}</span>
      </div>

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
            aria-labelledby="add-expense-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-white/10 bg-navy p-6 shadow-xl"
          >
            <h3
              id="add-expense-title"
              className="text-xl font-semibold text-white"
            >
              Add Expense
            </h3>
            <form onSubmit={(e) => void handleAdd(e)} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="expense-date"
                  className="block text-sm font-medium text-slate-300"
                >
                  Date <span className="text-accent">*</span>
                </label>
                <input
                  id="expense-date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="expense-store"
                  className="block text-sm font-medium text-slate-300"
                >
                  Store <span className="text-accent">*</span>
                </label>
                <input
                  id="expense-store"
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                  placeholder="Home Depot"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="expense-description"
                  className="block text-sm font-medium text-slate-300"
                >
                  Description
                </label>
                <textarea
                  id="expense-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${touchTextarea} mt-1.5 min-h-[88px]`}
                  placeholder="What was purchased?"
                />
              </div>
              <div>
                <label
                  htmlFor="expense-amount"
                  className="block text-sm font-medium text-slate-300"
                >
                  Amount <span className="text-accent">*</span>
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                  required
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
                  {busy ? "Saving…" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
