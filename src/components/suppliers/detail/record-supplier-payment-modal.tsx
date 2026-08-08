"use client";

import { useEffect, useMemo, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import {
  formatSupplierDate,
  formatSupplierMoney,
  type SupplierInvoice,
} from "@/lib/supplier-details-mock";
import { planFifoAllocations } from "@/lib/supplier-accounting";

const PAYMENT_METHODS = [
  "E-Transfer",
  "Cheque",
  "Credit Card",
  "ACH",
  "Cash",
  "Other",
] as const;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function RecordSupplierPaymentModal({
  open,
  invoices,
  initialSelectedInvoiceIds = [],
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  invoices: SupplierInvoice[];
  initialSelectedInvoiceIds?: string[];
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    notes: string;
    selectedInvoiceIds: string[];
  }) => Promise<void>;
}) {
  const openInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) => inv.dbStatus === "confirmed" && inv.balance > 0.009
      ),
    [invoices]
  );

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [paymentMethod, setPaymentMethod] = useState<string>("E-Transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [useManualSelection, setUseManualSelection] = useState(
    initialSelectedInvoiceIds.length > 0
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedInvoiceIds
  );

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setPaymentDate(todayIsoDate());
    setPaymentMethod("E-Transfer");
    setReferenceNumber("");
    setNotes("");
    setUseManualSelection(initialSelectedInvoiceIds.length > 0);
    setSelectedIds(initialSelectedInvoiceIds);
  }, [open, initialSelectedInvoiceIds]);

  const parsedAmount = Number.parseFloat(amount);
  const validAmount =
    !Number.isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;

  const previewPool = useManualSelection
    ? openInvoices.filter((inv) => selectedIds.includes(inv.id))
    : openInvoices;

  const previewPlan = useMemo(
    () =>
      planFifoAllocations({
        paymentAmount: validAmount,
        invoices: previewPool,
      }),
    [validAmount, previewPool]
  );

  const allocatedTotal = previewPlan.reduce(
    (sum, row) => sum + row.amountApplied,
    0
  );
  const unallocated = Math.max(0, validAmount - allocatedTotal);

  function toggleInvoice(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (useManualSelection && selectedIds.length === 0) {
      return;
    }
    await onSubmit({
      amount: validAmount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
      selectedInvoiceIds: useManualSelection ? selectedIds : [],
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-supplier-payment-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl"
      >
        <h2
          id="record-supplier-payment-title"
          className="text-xl font-semibold text-white"
        >
          Record Payment
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Payments apply to the supplier account. Leave invoices unchecked to
          auto-allocate oldest-first (FIFO).
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">Amount</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={`${touchInput} mt-1.5`}
                placeholder="0.00"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-300">Date</span>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                className={`${touchInput} mt-1.5`}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Method</span>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={`${touchInput} mt-1.5 appearance-none`}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method} className="bg-navy text-white">
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">
              Reference # (optional)
            </span>
            <input
              type="text"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Cheque #, transfer ID…"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={`${touchTextarea} mt-1.5`}
              rows={2}
            />
          </label>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={useManualSelection}
                onChange={(event) => {
                  setUseManualSelection(event.target.checked);
                  if (!event.target.checked) setSelectedIds([]);
                }}
                className="h-4 w-4 rounded border-white/20 bg-transparent text-accent focus:ring-accent"
              />
              Apply to specific invoices (otherwise FIFO on all open invoices)
            </label>

            {useManualSelection ? (
              openInvoices.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  No confirmed invoices with a remaining balance.
                </p>
              ) : (
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                  {openInvoices.map((invoice) => (
                    <li key={invoice.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-sm hover:bg-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(invoice.id)}
                          onChange={() => toggleInvoice(invoice.id)}
                          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent text-accent focus:ring-accent"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-white">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="block text-xs text-slate-500">
                            Due {formatSupplierDate(invoice.dueDate)} · Balance{" "}
                            {formatSupplierMoney(invoice.balance)}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>

          {validAmount > 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-slate-400">
              <p className="font-semibold uppercase tracking-wide text-slate-500">
                Allocation preview
              </p>
              {previewPlan.length === 0 ? (
                <p className="mt-1">
                  No open confirmed invoices — payment will sit as account
                  credit.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {previewPlan.map((row) => {
                    const inv = invoices.find((i) => i.id === row.invoiceId);
                    return (
                      <li
                        key={row.invoiceId}
                        className="flex justify-between gap-2 text-slate-300"
                      >
                        <span>{inv?.invoiceNumber ?? row.invoiceId}</span>
                        <span>{formatSupplierMoney(row.amountApplied)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {unallocated > 0.009 ? (
                <p className="mt-2 text-amber-200">
                  Unallocated credit: {formatSupplierMoney(unallocated)}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className={`${touchBtnSecondary} w-full sm:w-auto`}
            >
              Cancel
            </button>
            {useManualSelection && selectedIds.length === 0 ? (
              <p className="text-sm text-amber-200">
                Select at least one invoice, or turn off specific-invoice mode
                for FIFO.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                busy ||
                validAmount <= 0 ||
                (useManualSelection && selectedIds.length === 0)
              }
              className={`${touchBtnPrimary} w-full sm:w-auto disabled:opacity-40`}
            >
              {busy ? "Saving…" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
