"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  IconMail,
  IconPhone,
} from "@/components/dashboard/workspace-icons";
import {
  EmployeeAccountSidebar,
  EmployeePaymentsPlaceholder,
} from "@/components/employees/detail/employee-account-sidebar";
import { EmployeeInvoicesTab } from "@/components/employees/detail/employee-invoices-tab";
import { EmployeeSummaryCards } from "@/components/employees/detail/employee-summary-cards";
import { RecordLabourPaymentModal } from "@/components/employees/detail/record-labour-payment-modal";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import {
  EMPLOYEE_DETAILS_TABS,
  formatEmployeeDate,
  getEmployeeInitials,
  type EmployeeDetailsTab,
  type EmployeeDetailsViewModel,
  type LabourInvoice,
} from "@/lib/employee-details";
import {
  confirmLabourInvoice,
  recordLabourPayment,
} from "@/lib/labour-payment-actions";
import { createClient } from "@/lib/supabase";

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ContactChip({
  label,
  icon,
  value,
  href,
}: {
  label: string;
  icon: React.ReactNode;
  value: string | null;
  href?: string;
}) {
  const content = (
    <>
      <span className="text-cyan-400/90">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="block truncate text-sm text-slate-200">
          {value || "—"}
        </span>
      </span>
    </>
  );

  const className =
    "inline-flex max-w-full items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2";

  if (href && value) {
    return (
      <a
        href={href}
        className={`${className} transition hover:border-accent/40 hover:bg-accent/5`}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

export function EmployeeDetailsPage({
  employee,
  backfillNotice = null,
}: {
  employee: EmployeeDetailsViewModel;
  backfillNotice?: string | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EmployeeDetailsTab>("invoices");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [preselectedInvoiceIds, setPreselectedInvoiceIds] = useState<string[]>(
    []
  );

  const initials = useMemo(
    () => getEmployeeInitials(employee.name),
    [employee.name]
  );

  function openPaymentModal(invoice?: LabourInvoice) {
    setPaymentError(null);
    setActionError(null);
    setPreselectedInvoiceIds(invoice ? [invoice.id] : []);
    setPaymentModalOpen(true);
  }

  async function handleConfirmInvoice(invoice: LabourInvoice) {
    if (invoice.dbStatus !== "pending_confirmation") return;
    setConfirmingId(invoice.id);
    setActionError(null);
    setActionSuccess(null);

    const supabase = createClient();
    const result = await confirmLabourInvoice(supabase, {
      invoiceId: invoice.id,
      employeeId: employee.id,
    });

    setConfirmingId(null);

    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    setActionSuccess(`Invoice ${invoice.invoiceNumber} confirmed.`);
    router.refresh();
  }

  async function handleRecordPayment(input: {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    notes: string;
    selectedInvoiceIds: string[];
  }) {
    setPaymentBusy(true);
    setPaymentError(null);
    setActionError(null);
    setActionSuccess(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPaymentError("You must be logged in.");
      setPaymentBusy(false);
      return;
    }

    const result = await recordLabourPayment(supabase, {
      employeeId: employee.id,
      userId: user.id,
      amount: input.amount,
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      selectedInvoiceIds: input.selectedInvoiceIds,
      invoices: employee.invoices,
    });

    setPaymentBusy(false);

    if (!result.ok) {
      setPaymentError(result.error);
      return;
    }

    setPaymentModalOpen(false);
    setActionSuccess("Payment recorded.");
    router.refresh();
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-white/10 bg-[#14263D]/80 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="text-sm text-slate-500">
          <Link
            href="/dashboard/settings?section=employees"
            className="transition hover:text-accent"
          >
            Employees
          </Link>
          <span className="mx-2 text-slate-600">›</span>
          <span className="text-slate-300">{employee.name}</span>
        </nav>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-cyan-400 text-xl font-bold text-white shadow-lg shadow-accent/25">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {employee.name}
                  </h1>
                  {employee.role ? (
                    <span className="inline-flex rounded-full bg-slate-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300 ring-1 ring-slate-500/30">
                      {employee.role}
                    </span>
                  ) : null}
                  {employee.summary.pendingReviewCount > 0 ? (
                    <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-amber-500/30">
                      {employee.summary.pendingReviewCount} pending review
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <ContactChip
                    label="Phone"
                    icon={<IconPhone className="h-4 w-4" />}
                    value={employee.phone}
                    href={employee.phone ? `tel:${employee.phone}` : undefined}
                  />
                  <ContactChip
                    label="Email"
                    icon={<IconMail className="h-4 w-4" />}
                    value={employee.email}
                    href={
                      employee.email ? `mailto:${employee.email}` : undefined
                    }
                  />
                  <ContactChip
                    label="Address"
                    icon={<IconMapPin className="h-4 w-4" />}
                    value={employee.address}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Pay Rate
                    </p>
                    <p className="mt-0.5 font-medium text-slate-200">
                      {employee.payRateLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Pay Period
                    </p>
                    <p className="mt-0.5 font-medium text-slate-200">
                      {employee.payPeriodLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Hire Date
                    </p>
                    <p className="mt-0.5 font-medium text-slate-200">
                      {formatEmployeeDate(employee.hireDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
            <Link
              href="/dashboard/settings?section=employees"
              className={touchBtnSecondary}
            >
              Back to Settings
            </Link>
            <button
              type="button"
              onClick={() => openPaymentModal()}
              className={touchBtnPrimary}
            >
              + Record Payment
            </button>
          </div>
        </div>
      </div>

      {(backfillNotice || actionError || actionSuccess) && (
        <div className="space-y-2 px-4 pt-4 sm:px-6 lg:px-8">
          {backfillNotice ? (
            <p
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
              role="status"
            >
              {backfillNotice}
            </p>
          ) : null}
          {actionError ? (
            <p
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {actionError}
            </p>
          ) : null}
          {actionSuccess ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {actionSuccess}
            </p>
          ) : null}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <EmployeeSummaryCards summary={employee.summary} />

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-5">
            <div className="overflow-x-auto border-b border-white/10">
              <div className="flex min-w-max gap-1 pb-px">
                {EMPLOYEE_DETAILS_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                        isActive
                          ? "border-accent text-white"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              {activeTab === "invoices" ? (
                <EmployeeInvoicesTab
                  invoices={employee.invoices}
                  confirmingId={confirmingId}
                  onConfirmInvoice={(invoice) =>
                    void handleConfirmInvoice(invoice)
                  }
                  onRecordPayment={(invoice) => openPaymentModal(invoice)}
                />
              ) : null}
              {activeTab === "payments" ? (
                <EmployeePaymentsPlaceholder
                  payments={employee.payments}
                  onRecordPayment={() => openPaymentModal()}
                />
              ) : null}
              {activeTab === "notes" ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                  <h2 className="text-lg font-semibold text-white">Notes</h2>
                  <p className="mt-2 text-sm text-slate-400">{employee.notes}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-80 xl:w-96">
            <EmployeeAccountSidebar
              summary={employee.summary}
              payments={employee.payments}
              onViewAllPayments={() => setActiveTab("payments")}
              onRecordPayment={() => openPaymentModal()}
            />
          </div>
        </div>
      </div>

      <RecordLabourPaymentModal
        open={paymentModalOpen}
        invoices={employee.invoices}
        initialSelectedInvoiceIds={preselectedInvoiceIds}
        busy={paymentBusy}
        error={paymentError}
        onClose={() => {
          if (!paymentBusy) setPaymentModalOpen(false);
        }}
        onSubmit={handleRecordPayment}
      />
    </div>
  );
}
