"use client";

import { useMemo, useState } from "react";
import { IconMore } from "@/components/dashboard/workspace-icons";
import { touchInput } from "@/components/quotes/ui";
import {
  formatSupplierDate,
  formatSupplierMoney,
  supplierInvoiceStatusClass,
  supplierInvoiceStatusLabel,
  type SupplierInvoice,
  type SupplierInvoiceStatus,
} from "@/lib/supplier-details-mock";

const STATUS_FILTERS: { id: "all" | SupplierInvoiceStatus; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "paid", label: "Paid" },
  { id: "partial", label: "Partial" },
  { id: "unpaid", label: "Unpaid" },
  { id: "overdue", label: "Overdue" },
];

const PAGE_SIZE = 5;

export function SupplierInvoicesTab({
  invoices,
}: {
  invoices: SupplierInvoice[];
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | SupplierInvoiceStatus>(
    "all"
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }
      if (dateFrom && invoice.invoiceDate < dateFrom) return false;
      if (dateTo && invoice.invoiceDate > dateTo) return false;
      if (!query) return true;
      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.projectName.toLowerCase().includes(query) ||
        invoice.customerName.toLowerCase().includes(query)
      );
    });
  }, [invoices, statusFilter, dateFrom, dateTo, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, row) => ({
          amount: acc.amount + row.amount,
          paid: acc.paid + row.paid,
          balance: acc.balance + row.balance,
        }),
        { amount: 0, paid: 0, balance: 0 }
      ),
    [filtered]
  );

  function resetPageOnFilter() {
    setPage(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="min-w-[10rem] flex-1">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as "all" | SupplierInvoiceStatus);
              resetPageOnFilter();
            }}
            className={`${touchInput} w-full`}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[9rem] flex-1">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            From
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              resetPageOnFilter();
            }}
            className={`${touchInput} w-full`}
          />
        </label>
        <label className="min-w-[9rem] flex-1">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            To
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              resetPageOnFilter();
            }}
            className={`${touchInput} w-full`}
          />
        </label>
        <label className="min-w-[12rem] flex-[1.4]">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Search
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPageOnFilter();
            }}
            placeholder="Invoice, project, customer…"
            className={`${touchInput} w-full`}
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Invoice #</th>
              <th className="px-3 py-3 font-semibold">Project</th>
              <th className="px-3 py-3 font-semibold">Customer</th>
              <th className="px-3 py-3 font-semibold">Date</th>
              <th className="px-3 py-3 font-semibold">Due Date</th>
              <th className="px-3 py-3 text-right font-semibold">Amount</th>
              <th className="px-3 py-3 text-right font-semibold">Paid</th>
              <th className="px-3 py-3 text-right font-semibold">Balance</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No invoices match these filters.
                </td>
              </tr>
            ) : (
              pageRows.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-white/5 text-slate-300"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-3">
                    {invoice.projectName}
                  </td>
                  <td className="max-w-[9rem] truncate px-3 py-3">
                    {invoice.customerName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatSupplierDate(invoice.invoiceDate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatSupplierDate(invoice.dueDate)}
                  </td>
                  <td className="px-3 py-3 text-right text-white">
                    {formatSupplierMoney(invoice.amount)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatSupplierMoney(invoice.paid)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-white">
                    {formatSupplierMoney(invoice.balance)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${supplierInvoiceStatusClass(
                        invoice.status
                      )}`}
                    >
                      {supplierInvoiceStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="relative px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId((current) =>
                          current === invoice.id ? null : invoice.id
                        )
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
                      aria-label={`Actions for ${invoice.invoiceNumber}`}
                    >
                      <IconMore className="h-4 w-4" />
                    </button>
                    {openMenuId === invoice.id ? (
                      <div className="absolute right-4 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
                        {["View", "Record payment", "Download"].map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setOpenMenuId(null)}
                            className="block w-full px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 bg-white/[0.03] text-sm font-semibold text-white">
              <td className="px-4 py-3" colSpan={5}>
                Totals ({filtered.length} invoice
                {filtered.length === 1 ? "" : "s"})
              </td>
              <td className="px-3 py-3 text-right">
                {formatSupplierMoney(totals.amount)}
              </td>
              <td className="px-3 py-3 text-right">
                {formatSupplierMoney(totals.paid)}
              </td>
              <td className="px-3 py-3 text-right">
                {formatSupplierMoney(totals.balance)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–
          {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of{" "}
          {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="inline-flex min-h-[36px] items-center rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400">
            Page {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() =>
              setPage((current) => Math.min(pageCount - 1, current + 1))
            }
            className="inline-flex min-h-[36px] items-center rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
