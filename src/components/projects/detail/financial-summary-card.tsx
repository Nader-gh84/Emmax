"use client";

import { useState, type ReactNode } from "react";
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
  type ChangeOrder,
  type ProjectExpense,
  type ProjectPayment,
  type ProjectPaymentType,
  type TimeEntry,
} from "@/types/project-operations";
import type { MaterialOrder } from "@/types/material-order";
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
  hint,
  badge,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: "default" | "positive" | "negative";
  hint?: string;
  badge?: string;
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-red-300"
        : emphasize
          ? "text-white"
          : "text-slate-200";

  // Keep hint in sync with value tone for debt/warning rows (e.g. customer balance).
  const hintClass =
    tone === "negative"
      ? "text-red-300/80"
      : tone === "positive"
        ? "text-emerald-300/70"
        : "text-slate-500";

  return (
    <div
      className={`flex items-start justify-between gap-3 ${
        emphasize
          ? "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3"
          : ""
      }`}
    >
      <dt className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm ${
              emphasize ? "font-semibold text-white" : "text-slate-400"
            }`}
          >
            {label}
          </span>
          {badge ? (
            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200 ring-1 ring-amber-500/30">
              {badge}
            </span>
          ) : null}
        </div>
        {hint ? <p className={`mt-0.5 text-xs ${hintClass}`}>{hint}</p> : null}
      </dt>
      <dd className={`shrink-0 text-sm font-semibold ${valueClass}`}>{value}</dd>
    </div>
  );
}

function moneyTone(
  value: number,
  mode: "profit" | "debt" | "cash" = "profit"
): "default" | "positive" | "negative" {
  if (value === 0) return "default";
  if (mode === "debt") {
    // Positive = money owed (warning/debt) → red; zero/negative → neutral.
    return value > 0 ? "negative" : "default";
  }
  if (mode === "cash" || mode === "profit") {
    return value > 0 ? "positive" : "negative";
  }
  return "default";
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5 border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

export function FinancialSummaryCard({
  projectId,
  quoteAmount,
  depositAmount,
  payments,
  expenses,
  materialOrders = [],
  timeEntries = [],
  changeOrders = [],
  onPaymentAdded,
}: {
  projectId: string;
  quoteAmount: number;
  depositAmount: number;
  payments: ProjectPayment[];
  expenses: ProjectExpense[];
  materialOrders?: MaterialOrder[];
  timeEntries?: TimeEntry[];
  changeOrders?: ChangeOrder[];
  onPaymentAdded?: (payment: ProjectPayment) => void;
}) {
  const summary = computeFinancialSummary({
    quoteAmount,
    depositAmount,
    payments,
    expenses,
    materialOrders,
    timeEntries,
    changeOrders,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [paymentType, setPaymentType] =
    useState<ProjectPaymentType>("customer_payment");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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

  const outstandingBalanceTone = moneyTone(
    summary.outstandingCustomerBalance,
    "debt"
  );
  const accountsPayableTone = moneyTone(summary.accountsPayable, "debt");
  // Red when any supplier order cost is still unpaid (material_orders.payment_status).
  const supplierCostsTone = moneyTone(summary.unpaidSupplierCosts, "debt");
  const cashTone = moneyTone(summary.cashFlow, "cash");
  const profitTone = moneyTone(summary.grossProfit, "profit");
  const netReceivableTone = moneyTone(summary.netReceivablePosition, "profit");
  const outstandingBalanceHint =
    summary.outstandingCustomerBalance > 0
      ? "Customer still owes this amount"
      : summary.outstandingCustomerBalance < 0
        ? "Negative means customer overpaid"
        : "Settled — no balance remaining";
  const supplierCostsHint =
    summary.supplierCosts <= 0
      ? undefined
      : summary.unpaidSupplierCosts > 0
        ? `${formatProjectMoney(summary.unpaidSupplierCosts)} unpaid to suppliers`
        : "Supplier orders fully paid";

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
            {summary.pendingReviewCount > 0
              ? ` · ${summary.pendingReviewCount} expense(s) pending review`
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
      </div>

      {error && !modalOpen ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-1">
        <SummarySection title="Revenue">
          <SummaryRow
            label="Contract Value"
            value={formatProjectMoney(summary.contractValue)}
          />
          <SummaryRow
            label="Change Orders"
            value={formatProjectMoney(summary.changeOrdersAmount)}
            hint="Approved change orders only"
          />
          <SummaryRow
            label="Revised Contract Value"
            value={formatProjectMoney(summary.revisedContractValue)}
            emphasize
          />
        </SummarySection>

        <SummarySection title="Customer Payments">
          <SummaryRow
            label="Paid by Customer"
            value={formatProjectMoney(summary.customerPayments)}
          />
          <SummaryRow
            label="Outstanding Customer Balance"
            value={formatProjectMoney(summary.outstandingCustomerBalance)}
            tone={outstandingBalanceTone}
            hint={outstandingBalanceHint}
          />
        </SummarySection>

        <SummarySection title="Project Costs">
          <SummaryRow
            label="Supplier Costs"
            value={formatProjectMoney(summary.supplierCosts)}
            tone={supplierCostsTone}
            hint={supplierCostsHint}
          />
          <SummaryRow
            label="Extra Purchases"
            value={formatProjectMoney(summary.extraPurchases)}
            badge={
              summary.pendingReviewCount > 0
                ? `${summary.pendingReviewCount} pending review`
                : undefined
            }
            hint={
              summary.pendingReviewCount > 0
                ? `${formatProjectMoney(summary.pendingReviewAmount)} not counted until billing status is set`
                : undefined
            }
          />
          <SummaryRow
            label="Labour Cost"
            value={formatProjectMoney(summary.labourCost)}
          />
          <SummaryRow
            label="Other Expenses"
            value={formatProjectMoney(summary.otherExpenses)}
          />
          <SummaryRow
            label="Total Project Cost"
            value={formatProjectMoney(summary.totalProjectCost)}
            emphasize
          />
        </SummarySection>

        <SummarySection title="Profit">
          <SummaryRow
            label="Gross Profit"
            value={formatProjectMoney(summary.grossProfit)}
            tone={profitTone}
          />
          <SummaryRow
            label="Profit Margin"
            value={`${summary.profitMargin.toFixed(1)}%`}
            tone={profitTone}
          />
        </SummarySection>

        <SummarySection title="Cash">
          <SummaryRow
            label="Total Money Paid Out"
            value={formatProjectMoney(summary.totalMoneyPaidOut)}
          />
          <SummaryRow
            label="Cash Flow"
            value={formatProjectMoney(summary.cashFlow)}
            emphasize
            tone={cashTone}
          />
        </SummarySection>

        <SummarySection title="Outstanding Obligations">
          <SummaryRow
            label="Accounts Payable"
            value={formatProjectMoney(summary.accountsPayable)}
            tone={accountsPayableTone}
          />
          <SummaryRow
            label="Net Receivable Position"
            value={formatProjectMoney(summary.netReceivablePosition)}
            emphasize
            tone={netReceivableTone}
          />
        </SummarySection>
      </div>

      {showDetails ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payment history
          </p>
          {payments.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No payments recorded yet.</p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-start justify-between gap-2 border-b border-white/5 pb-2 text-sm last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200">
                      {payment.payment_type === "customer_payment"
                        ? "Customer payment"
                        : "Supplier payment"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {payment.payment_date}
                      {payment.notes ? ` · ${payment.notes}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-slate-300">
                    {formatProjectMoney(Number(payment.amount) || 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

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
