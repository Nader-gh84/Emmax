"use client";

import { useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import { logProjectActivity } from "@/lib/project-activity";
import { createClient } from "@/lib/supabase";
import {
  computeFinancialSummary,
  type ProjectExpense,
  type ProjectPayment,
  type ProjectPaymentType,
} from "@/types/project-operations";
import { formatProjectMoney } from "@/types/project";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const PAYMENT_TYPE_OPTIONS: { id: ProjectPaymentType; label: string }[] = [
  { id: "customer_payment", label: "Customer payment" },
  { id: "supplier_payment", label: "Supplier payment" },
];

function SummaryRow({
  label,
  value,
  emphasize,
  tone,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: "default" | "positive" | "negative";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-red-300"
        : emphasize
          ? "text-white"
          : "text-slate-200";

  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        emphasize
          ? "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3"
          : ""
      }`}
    >
      <dt
        className={`text-sm ${emphasize ? "font-semibold text-white" : "text-slate-400"}`}
      >
        {label}
      </dt>
      <dd className={`text-sm font-semibold ${valueClass}`}>{value}</dd>
    </div>
  );
}

export function FinancialSummaryCard({
  projectId,
  quoteAmount,
  depositAmount,
  payments,
  expenses,
  onPaymentAdded,
}: {
  projectId: string;
  quoteAmount: number;
  depositAmount: number;
  payments: ProjectPayment[];
  expenses: ProjectExpense[];
  onPaymentAdded?: (payment: ProjectPayment) => void;
}) {
  // Net Position = Paid by Customer − Total Costs
  const summary = computeFinancialSummary({
    quoteAmount,
    depositAmount,
    payments,
    expenses,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [paymentType, setPaymentType] =
    useState<ProjectPaymentType>("customer_payment");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const parsedAmount = Number.parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    if (!paymentDate) {
      setError("Payment date is required.");
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
      .from("project_payments")
      .insert({
        user_id: user.id,
        project_id: projectId,
        payment_type: paymentType,
        amount: parsedAmount,
        payment_date: paymentDate,
        notes: notes.trim() || null,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      setError("Failed to record payment.");
      setBusy(false);
      return;
    }

    const created = data as ProjectPayment;
    onPaymentAdded?.(created);

    const typeLabel =
      paymentType === "customer_payment"
        ? "customer payment"
        : "supplier payment";
    await logProjectActivity(supabase, {
      userId: user.id,
      projectId,
      activityType: "payment_recorded",
      description: `Recorded ${typeLabel} of ${formatProjectMoney(parsedAmount)}`,
    });

    setAmount("");
    setNotes("");
    setPaymentDate(todayIsoDate());
    setPaymentType("customer_payment");
    setModalOpen(false);
    setBusy(false);
  }

  const netTone =
    summary.netPosition > 0
      ? "positive"
      : summary.netPosition < 0
        ? "negative"
        : "default";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Financial Summary
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Deposit {formatProjectMoney(summary.depositAmount)} ·{" "}
            {summary.depositStatus}
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
          + Record Payment
        </button>
      </div>

      {error && !modalOpen ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <dl className="mt-4 space-y-3">
        <SummaryRow
          label="Quote Amount"
          value={formatProjectMoney(summary.quoteAmount)}
        />
        <SummaryRow
          label="Paid by Customer"
          value={formatProjectMoney(summary.paidByCustomer)}
        />
        <SummaryRow
          label="Total Due"
          value={formatProjectMoney(summary.totalDue)}
        />
        <SummaryRow
          label="Paid to Suppliers"
          value={formatProjectMoney(summary.paidToSuppliers)}
        />
        <SummaryRow
          label="Extra Purchases"
          value={formatProjectMoney(summary.extraPurchases)}
        />
        <SummaryRow
          label="Total Costs"
          value={formatProjectMoney(summary.totalCosts)}
        />
        <SummaryRow
          label="Net Position"
          value={formatProjectMoney(summary.netPosition)}
          emphasize
          tone={netTone}
        />
        <SummaryRow
          label="Deposit"
          value={`${formatProjectMoney(summary.depositAmount)} · ${summary.depositStatus}`}
        />
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
            aria-labelledby="record-payment-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-white/10 bg-navy p-6 shadow-xl"
          >
            <h3
              id="record-payment-title"
              className="text-xl font-semibold text-white"
            >
              Record Payment
            </h3>
            {error ? (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}
            <form onSubmit={(e) => void handleAdd(e)} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="payment-type"
                  className="block text-sm font-medium text-slate-300"
                >
                  Payment type <span className="text-accent">*</span>
                </label>
                <select
                  id="payment-type"
                  value={paymentType}
                  onChange={(e) =>
                    setPaymentType(e.target.value as ProjectPaymentType)
                  }
                  className={`${touchInput} mt-1.5`}
                  required
                >
                  {PAYMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="payment-amount"
                  className="block text-sm font-medium text-slate-300"
                >
                  Amount <span className="text-accent">*</span>
                </label>
                <input
                  id="payment-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="payment-date"
                  className="block text-sm font-medium text-slate-300"
                >
                  Payment date <span className="text-accent">*</span>
                </label>
                <input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={`${touchInput} mt-1.5`}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="payment-notes"
                  className="block text-sm font-medium text-slate-300"
                >
                  Notes
                </label>
                <textarea
                  id="payment-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${touchTextarea} mt-1.5 min-h-[88px]`}
                  placeholder="Optional notes"
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
                  {busy ? "Saving…" : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
