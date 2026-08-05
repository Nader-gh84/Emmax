"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import {
  createExpenseReceiptSignedUrl,
  deleteExpenseReceipt,
  uploadExpenseReceipt,
  validateExpenseReceiptFile,
} from "@/lib/expense-receipt-storage";
import { logProjectActivity } from "@/lib/project-activity";
import { createClient } from "@/lib/supabase";
import {
  isExpenseBillingStatus,
  type ExpenseBillingStatus,
  type ProjectExpense,
} from "@/types/project-operations";
import { formatProjectDate, formatProjectMoney } from "@/types/project";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const BILLING_STATUS_OPTIONS: {
  id: ExpenseBillingStatus;
  label: string;
}[] = [
  { id: "pending_review", label: "Pending Review" },
  { id: "add_to_change_order", label: "Add to Change Order" },
  { id: "included_in_customer_billing", label: "Included in Customer Billing" },
  { id: "company_cost", label: "Company Cost" },
];

function billingStatusLabel(status: ExpenseBillingStatus): string {
  return (
    BILLING_STATUS_OPTIONS.find((option) => option.id === status)?.label ??
    "Pending Review"
  );
}

function billingStatusSelectClass(status: ExpenseBillingStatus): string {
  switch (status) {
    case "pending_review":
      return "border-amber-500/40 bg-amber-500/10 text-amber-100";
    case "add_to_change_order":
      return "border-sky-500/40 bg-sky-500/10 text-sky-100";
    case "included_in_customer_billing":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
    case "company_cost":
      return "border-slate-500/40 bg-slate-500/10 text-slate-200";
    default:
      return "border-white/15 bg-white/5 text-slate-200";
  }
}

function IconReceipt({ className }: { className?: string }) {
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
        d="M9 5H7a2 2 0 00-2 2v12l2.5-1.5L10 19l2.5-1.5L15 19l2.5-1.5L20 19V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6m-5 5h4m-4 3h4m-4 3h2"
      />
    </svg>
  );
}

export function ExpensesCard({
  projectId,
  initialExpenses,
  onExpensesChange,
  readOnly = false,
}: {
  projectId: string;
  initialExpenses: ProjectExpense[];
  onExpensesChange?: (expenses: ProjectExpense[]) => void;
  readOnly?: boolean;
}) {
  const [expenses, setExpenses] = useState<ProjectExpense[]>(initialExpenses);
  const [modalOpen, setModalOpen] = useState(false);
  const [expenseDate, setExpenseDate] = useState(todayIsoDate());
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(
    null
  );
  const [billingStatus, setBillingStatus] =
    useState<ExpenseBillingStatus>("pending_review");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingBillingId, setUpdatingBillingId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLabel, setViewerLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  useEffect(() => {
    let cancelled = false;

    async function resolveSignedUrls() {
      const next: Record<string, string> = {};
      await Promise.all(
        expenses.map(async (expense) => {
          if (!expense.receipt_url) return;
          const url = await createExpenseReceiptSignedUrl(expense.receipt_url);
          if (url) next[expense.id] = url;
        })
      );
      if (!cancelled) setSignedUrls(next);
    }

    void resolveSignedUrls();
    return () => {
      cancelled = true;
    };
  }, [expenses]);

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(receiptFile);
    setReceiptPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [receiptFile]);

  function syncExpenses(next: ProjectExpense[]) {
    setExpenses(next);
    onExpensesChange?.(next);
  }

  function resetForm() {
    setStoreName("");
    setDescription("");
    setAmount("");
    setExpenseDate(todayIsoDate());
    setBillingStatus("pending_review");
    setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const pendingReviewCount = useMemo(
    () =>
      expenses.filter((row) => row.billing_status === "pending_review").length,
    [expenses]
  );

  function closeModal() {
    if (busy) return;
    setModalOpen(false);
    resetForm();
    setError(null);
  }

  const total = useMemo(
    () => expenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [expenses]
  );

  function handleReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setReceiptFile(null);
      return;
    }
    const validationError = validateExpenseReceiptFile(file);
    if (validationError) {
      setError(validationError);
      setReceiptFile(null);
      event.target.value = "";
      return;
    }
    setError(null);
    setReceiptFile(file);
  }

  async function handleBillingStatusChange(
    expense: ProjectExpense,
    nextStatus: ExpenseBillingStatus
  ) {
    if (readOnly) return;
    if (expense.billing_status === nextStatus) return;

    setUpdatingBillingId(expense.id);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("project_expenses")
      .update({ billing_status: nextStatus })
      .eq("id", expense.id)
      .eq("project_id", projectId);

    if (updateError) {
      setError(
        updateError.message?.includes("billing_status")
          ? "Failed to update billing status. Run migration 034."
          : "Failed to update billing status."
      );
      setUpdatingBillingId(null);
      return;
    }

    syncExpenses(
      expenses.map((row) =>
        row.id === expense.id ? { ...row, billing_status: nextStatus } : row
      )
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logProjectActivity(supabase, {
        userId: user.id,
        projectId,
        activityType: "expense_billing_updated",
        description: `Updated billing status for ${expense.store_name || "expense"} to ${billingStatusLabel(nextStatus)}`,
      });
    }

    setUpdatingBillingId(null);
  }

  async function handleDelete(expense: ProjectExpense) {
    if (readOnly) return;
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

    await deleteExpenseReceipt(expense.receipt_url);
    syncExpenses(expenses.filter((row) => row.id !== expense.id));
    setDeletingId(null);
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
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

    let receiptPath: string | null = null;
    if (receiptFile) {
      const uploadResult = await uploadExpenseReceipt({
        userId: user.id,
        projectId,
        file: receiptFile,
      });
      if ("error" in uploadResult) {
        setError(uploadResult.error);
        setBusy(false);
        return;
      }
      receiptPath = uploadResult.path;
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
        receipt_url: receiptPath,
        billing_status: billingStatus,
        payment_status: "unpaid",
        expense_kind: "extra_purchase",
      })
      .select("*")
      .single();

    if (insertError || !data) {
      if (receiptPath) await deleteExpenseReceipt(receiptPath);
      setError(
        insertError?.message?.includes("receipt_url")
          ? "Failed to add expense. Run migration 031/032 so receipt_url exists."
          : insertError?.message?.includes("billing_status") ||
              insertError?.message?.includes("expense_kind")
            ? "Failed to add expense. Run migration 034_project_financial_accounting.sql."
            : "Failed to add expense."
      );
      setBusy(false);
      return;
    }

    const createdRaw = data as ProjectExpense;
    const createdStatus = isExpenseBillingStatus(createdRaw.billing_status)
      ? createdRaw.billing_status
      : billingStatus;
    const created: ProjectExpense = {
      ...createdRaw,
      amount: Number(createdRaw.amount) || 0,
      billing_status: createdStatus,
      payment_status: "unpaid",
      expense_kind: "extra_purchase",
    };
    syncExpenses([created, ...expenses]);

    await logProjectActivity(supabase, {
      userId: user.id,
      projectId,
      activityType: "expense_added",
      description: `Added expense at ${created.store_name} (${formatProjectMoney(parsedAmount)}, ${billingStatusLabel(createdStatus)})${
        receiptPath ? " with receipt" : ""
      }`,
    });

    resetForm();
    setModalOpen(false);
    setBusy(false);
  }

  function openReceiptViewer(expense: ProjectExpense) {
    const url = signedUrls[expense.id];
    if (!url) return;
    setViewerLabel(`${expense.store_name || "Expense"} receipt`);
    setViewerUrl(url);
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
            {pendingReviewCount > 0
              ? ` · ${pendingReviewCount} pending review`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDetails((open) => !open)}
            className="text-xs font-semibold text-accent transition hover:text-blue-400"
          >
            {showDetails ? "Hide Details" : "View Details"}
          </button>
          {!readOnly ? (
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
          ) : null}
        </div>
      </div>

      {error && !modalOpen ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {expenses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No expenses yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {(showDetails ? expenses : expenses.slice(0, 3)).map((expense) => {
            const thumbUrl = signedUrls[expense.id];
            return (
              <li
                key={expense.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {expense.receipt_url ? (
                    thumbUrl ? (
                      <button
                        type="button"
                        onClick={() => openReceiptViewer(expense)}
                        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/5 transition hover:ring-2 hover:ring-accent/50"
                        aria-label={`View receipt for ${expense.store_name || "expense"}`}
                        title="View receipt"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ) : (
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-500"
                        title="Loading receipt…"
                      >
                        <IconReceipt className="h-5 w-5" />
                      </span>
                    )
                  ) : (
                    <span
                      className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-transparent px-1 text-center text-[9px] leading-tight text-slate-600"
                      title="No receipt"
                    >
                      No receipt
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      {expense.store_name || "Store"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {expense.description || "—"} ·{" "}
                      {formatProjectDate(expense.expense_date)}
                    </p>
                    <label className="mt-2 block">
                      <span className="sr-only">
                        Billing status for {expense.store_name || "expense"}
                      </span>
                      <select
                        value={
                          isExpenseBillingStatus(expense.billing_status)
                            ? expense.billing_status
                            : "pending_review"
                        }
                        disabled={
                          readOnly || updatingBillingId === expense.id
                        }
                        onChange={(event) => {
                          const next = event.target.value;
                          if (!isExpenseBillingStatus(next)) return;
                          void handleBillingStatusChange(expense, next);
                        }}
                        className={`mt-0.5 w-full max-w-[220px] rounded-lg border px-2 py-1.5 text-[11px] font-semibold outline-none transition focus:ring-1 focus:ring-accent disabled:opacity-50 ${billingStatusSelectClass(
                          isExpenseBillingStatus(expense.billing_status)
                            ? expense.billing_status
                            : "pending_review"
                        )}`}
                      >
                        {BILLING_STATUS_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-sm font-semibold text-white">
                    {formatProjectMoney(Number(expense.amount) || 0)}
                  </span>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(expense)}
                      disabled={deletingId === expense.id}
                      className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-white/10 hover:text-red-300 disabled:opacity-40"
                      aria-label={`Delete expense from ${expense.store_name}`}
                    >
                      {deletingId === expense.id ? "…" : "Delete"}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-sm font-semibold text-white">
        <span>Total</span>
        <span>{formatProjectMoney(total)}</span>
      </div>

      {modalOpen && !readOnly ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-expense-title"
            className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl"
          >
            <h3
              id="add-expense-title"
              className="text-xl font-semibold text-white"
            >
              Add Expense
            </h3>
            {error ? (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}
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
              <div>
                <label
                  htmlFor="expense-billing-status"
                  className="block text-sm font-medium text-slate-300"
                >
                  Billing status
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Pending Review expenses are excluded from Financial Summary
                  totals until resolved.
                </p>
                <select
                  id="expense-billing-status"
                  value={billingStatus}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (isExpenseBillingStatus(next)) setBillingStatus(next);
                  }}
                  className={`${touchInput} mt-1.5`}
                >
                  {BILLING_STATUS_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="expense-receipt"
                  className="block text-sm font-medium text-slate-300"
                >
                  Receipt photo{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Take a photo on site or choose an image from your gallery.
                </p>
                <input
                  ref={fileInputRef}
                  id="expense-receipt"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptChange}
                  className="mt-2 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-white/15"
                />
                {receiptPreviewUrl ? (
                  <div className="mt-3 flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptPreviewUrl}
                      alt="Receipt preview"
                      className="h-20 w-20 rounded-lg border border-white/15 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-slate-300">
                        {receiptFile?.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="mt-1 text-xs font-semibold text-slate-400 transition hover:text-red-300"
                      >
                        Remove photo
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={closeModal}
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

      {viewerUrl ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={() => setViewerUrl(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={viewerLabel || "Receipt"}
            className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/15 bg-navy shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <p className="truncate text-sm font-semibold text-white">
                {viewerLabel || "Receipt"}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={viewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-accent transition hover:bg-white/10"
                >
                  Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => setViewerUrl(null)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black/40 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewerUrl}
                alt={viewerLabel || "Receipt"}
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
