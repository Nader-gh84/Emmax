"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  IconMail,
  IconPhone,
} from "@/components/dashboard/workspace-icons";
import {
  SupplierAccountSidebar,
  SupplierPaymentsPlaceholder,
} from "@/components/suppliers/detail/supplier-account-sidebar";
import { SupplierDocumentsSection } from "@/components/suppliers/detail/supplier-documents-section";
import { SupplierInvoicesTab } from "@/components/suppliers/detail/supplier-invoices-tab";
import { SupplierSummaryCards } from "@/components/suppliers/detail/supplier-summary-cards";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import {
  SUPPLIER_DETAILS_TABS,
  getSupplierInitials,
  type SupplierDetailsTab,
  type SupplierDetailsViewModel,
} from "@/lib/supplier-details-mock";

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

export function SupplierDetailsPage({
  supplier,
}: {
  supplier: SupplierDetailsViewModel;
}) {
  const [activeTab, setActiveTab] = useState<SupplierDetailsTab>("invoices");
  const initials = useMemo(
    () => getSupplierInitials(supplier.name),
    [supplier.name]
  );

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-white/10 bg-[#0B1220]/80 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="text-sm text-slate-500">
          <Link
            href="/dashboard/suppliers"
            className="transition hover:text-accent"
          >
            Suppliers
          </Link>
          <span className="mx-2 text-slate-600">›</span>
          <span className="text-slate-300">{supplier.name}</span>
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
                    {supplier.name}
                  </h1>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${
                      supplier.status === "active"
                        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                        : "bg-slate-500/15 text-slate-300 ring-slate-500/30"
                    }`}
                  >
                    {supplier.status === "active" ? "Active" : "Inactive"}
                  </span>
                  {supplier.summary.creditStatus === "over" ? (
                    <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-red-300 ring-1 ring-red-500/30">
                      Over credit limit
                    </span>
                  ) : null}
                  {supplier.summary.creditStatus === "approaching" ? (
                    <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-amber-500/30">
                      Approaching limit
                    </span>
                  ) : null}
                  {supplier.summary.pendingReviewCount > 0 ? (
                    <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-amber-500/30">
                      {supplier.summary.pendingReviewCount} pending review
                    </span>
                  ) : null}
                </div>
                {supplier.contactPerson ? (
                  <p className="mt-1 text-sm text-slate-400">
                    Contact:{" "}
                    <span className="text-slate-300">
                      {supplier.contactPerson}
                    </span>
                  </p>
                ) : null}

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <ContactChip
                    label="Phone"
                    icon={<IconPhone className="h-4 w-4" />}
                    value={supplier.phone}
                    href={supplier.phone ? `tel:${supplier.phone}` : undefined}
                  />
                  <ContactChip
                    label="Email"
                    icon={<IconMail className="h-4 w-4" />}
                    value={supplier.email}
                    href={
                      supplier.email ? `mailto:${supplier.email}` : undefined
                    }
                  />
                  <ContactChip
                    label="Address"
                    icon={<IconMapPin className="h-4 w-4" />}
                    value={supplier.address}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Payment Terms
                    </p>
                    <p className="mt-0.5 font-medium text-slate-200">
                      {supplier.paymentTerms}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Default Account #
                    </p>
                    <p className="mt-0.5 font-mono font-medium text-slate-200">
                      {supplier.defaultAccountNumber}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
            <button type="button" className={touchBtnSecondary}>
              Edit Supplier
            </button>
            <button type="button" className={touchBtnPrimary}>
              + Record Payment
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <SupplierSummaryCards summary={supplier.summary} />

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-5">
            <div className="overflow-x-auto border-b border-white/10">
              <div className="flex min-w-max gap-1 pb-px">
                {SUPPLIER_DETAILS_TABS.map((tab) => {
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
                <SupplierInvoicesTab invoices={supplier.invoices} />
              ) : null}
              {activeTab === "payments" ? (
                <SupplierPaymentsPlaceholder payments={supplier.payments} />
              ) : null}
              {activeTab === "statements" ||
              activeTab === "documents" ||
              activeTab === "notes" ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                  <h2 className="text-lg font-semibold text-white">
                    {
                      SUPPLIER_DETAILS_TABS.find((t) => t.id === activeTab)
                        ?.label
                    }
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {activeTab === "notes"
                      ? supplier.notes
                      : "Coming in a later stage — placeholder content only."}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-80 xl:w-96">
            <SupplierAccountSidebar
              summary={supplier.summary}
              payments={supplier.payments}
              onViewAllPayments={() => setActiveTab("payments")}
              onRecordPayment={() => setActiveTab("payments")}
            />
          </div>
        </div>

        <SupplierDocumentsSection documents={supplier.documents} />
      </div>
    </div>
  );
}
