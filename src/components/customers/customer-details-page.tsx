"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  IconCheckCircle,
  IconClock,
  IconDocumentDraft,
  IconInvoice,
} from "@/components/dashboard/icons";
import {
  IconMail,
  IconMore,
  IconPhone,
} from "@/components/dashboard/workspace-icons";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import {
  CUSTOMER_DETAILS_TABS,
  formatCustomerDate,
  formatCustomerMoney,
  getCustomerInitials,
  type CustomerActivityItem,
  type CustomerDetailsTab,
  type CustomerDetailsViewModel,
} from "@/lib/customer-details-mock";
import type {
  CustomerPaymentListItem,
  CustomerProjectFinancial,
} from "@/lib/customer-financials";
import {
  asProjectLabour,
  asProjectMaterials,
  formatProjectDate,
  formatProjectMoney,
  projectStatusClass,
  projectStatusLabel,
  type Project,
  type ProjectStatus,
} from "@/types/project";

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconMessage({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function IconPayment({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ActivityIcon({ type }: { type: CustomerActivityItem["type"] }) {
  const className = "h-4 w-4";
  switch (type) {
    case "payment_received":
      return <IconPayment className={className} />;
    case "invoice_overdue":
      return <IconInvoice className={className} />;
    case "project_started":
      return <IconClock className={className} />;
    case "quote_accepted":
      return <IconCheckCircle className={className} />;
    case "note_added":
      return <IconDocumentDraft className={className} />;
    default:
      return <IconDocumentDraft className={className} />;
  }
}

function activityAccent(type: CustomerActivityItem["type"]) {
  switch (type) {
    case "payment_received":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "invoice_overdue":
      return "bg-red-500/15 text-red-300 ring-red-500/30";
    case "project_started":
      return "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30";
    case "quote_accepted":
      return "bg-accent/15 text-accent ring-accent/30";
    default:
      return "bg-white/10 text-slate-300 ring-white/15";
  }
}

export function CustomerDetailsPage({
  customer,
  projects = [],
  projectFinancials = [],
  customerPayments = [],
  addressPlaceholder = null,
}: {
  customer: CustomerDetailsViewModel;
  projects?: Project[];
  projectFinancials?: CustomerProjectFinancial[];
  customerPayments?: CustomerPaymentListItem[];
  addressPlaceholder?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<CustomerDetailsTab>("overview");
  const [moreOpen, setMoreOpen] = useState(false);
  const initials = useMemo(
    () => getCustomerInitials(customer.fullName),
    [customer.fullName]
  );

  const customerWithCounts = useMemo(
    () => ({
      ...customer,
      counts: {
        ...customer.counts,
        projects: projects.length,
        financial: projectFinancials.length,
        payments: customerPayments.length,
      },
    }),
    [customer, projects.length, projectFinancials.length, customerPayments.length]
  );

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-white/10 bg-[#0B1220]/80 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="text-sm text-slate-500">
          <Link
            href="/dashboard/customers"
            className="transition hover:text-accent"
          >
            Customers
          </Link>
          <span className="mx-2 text-slate-600">›</span>
          <span className="text-slate-300">{customer.fullName}</span>
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
                    {customer.fullName}
                  </h1>
                  <StatusBadge status={customer.status} />
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Customer Since {formatCustomerDate(customer.customerSince)}
                  <span className="mx-2 text-slate-600">·</span>
                  Customer ID:{" "}
                  <span className="font-medium text-slate-300">
                    {customer.displayId}
                  </span>
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <ContactChip
                    label="Mobile"
                    icon={<IconPhone className="h-4 w-4" />}
                    value={customer.phone}
                    href={customer.phone ? `tel:${customer.phone}` : undefined}
                  />
                  <ContactChip
                    label="Email"
                    icon={<IconMail className="h-4 w-4" />}
                    value={customer.email}
                    href={
                      customer.email ? `mailto:${customer.email}` : undefined
                    }
                  />
                  <ContactChip
                    label="Address"
                    icon={<IconMapPin className="h-4 w-4" />}
                    value={customer.address}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <ActionButton
                    label="Call"
                    icon={<IconPhone className="h-4 w-4" />}
                    href={customer.phone ? `tel:${customer.phone}` : undefined}
                  />
                  <ActionButton
                    label="Email"
                    icon={<IconMail className="h-4 w-4" />}
                    href={
                      customer.email ? `mailto:${customer.email}` : undefined
                    }
                  />
                  <ActionButton
                    label="Message"
                    icon={<IconMessage className="h-4 w-4" />}
                    href={
                      customer.phone ? `sms:${customer.phone}` : undefined
                    }
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMoreOpen((open) => !open)}
                      className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                      aria-label="More actions"
                    >
                      <IconMore className="h-4 w-4" />
                    </button>
                    {moreOpen ? (
                      <div className="absolute left-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
                        {["Archive", "Export", "Delete"].map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setMoreOpen(false)}
                            className="block w-full px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
            <button type="button" className={touchBtnSecondary}>
              Edit Customer
            </button>
            <button type="button" className={touchBtnPrimary}>
              + New Project
            </button>
          </div>
        </div>
      </div>

      {customer.outstanding &&
      customer.outstanding.totalOutstanding > 0 &&
      customer.outstanding.projectCount > 0 ? (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-300">
                Outstanding Balance
              </p>
              <p className="mt-1 text-sm text-red-100/90">
                {customer.outstanding.projectCount} project
                {customer.outstanding.projectCount === 1 ? "" : "s"} with
                outstanding balance
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-bold text-white">
                {formatCustomerMoney(customer.outstanding.totalOutstanding)}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("financial")}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-400/40 bg-red-500/20 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-500/30"
              >
                View Outstanding
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-6 px-4 py-5 sm:px-6 lg:flex-row lg:px-8">
        <div className="min-w-0 flex-1">
          <div className="overflow-x-auto border-b border-white/10">
            <div className="flex min-w-max gap-1 pb-px">
              {CUSTOMER_DETAILS_TABS.map((tab) => {
                const count = tab.countKey
                  ? customerWithCounts.counts[tab.countKey]
                  : null;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? "border-accent text-white"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                    {typeof count === "number" ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? "bg-accent/20 text-accent"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <TabPanel
              tab={activeTab}
              customerId={customer.id}
              customerName={customer.fullName}
              projects={projects}
              projectFinancials={projectFinancials}
              customerPayments={customerPayments}
              addressPlaceholder={addressPlaceholder}
              onOpenProjects={() => setActiveTab("projects")}
            />
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-80 xl:w-96">
          <CustomerSummaryCard customer={customerWithCounts} />
          <LocationsCard
            customer={customerWithCounts}
            onViewAll={() => setActiveTab("locations")}
          />
          <ActivityTimelineCard
            items={customerWithCounts.recentActivity}
            onViewFull={() => setActiveTab("timeline")}
          />
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${
        active
          ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
          : "bg-slate-500/15 text-slate-300 ring-slate-500/30"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
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
      <a href={href} className={`${className} transition hover:border-accent/40 hover:bg-accent/5`}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

function ActionButton({
  label,
  icon,
  href,
}: {
  label: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const className =
    "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

  if (href) {
    return (
      <a href={href} className={className}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <button type="button" disabled className={className}>
      {icon}
      {label}
    </button>
  );
}

function TabPanel({
  tab,
  customerId,
  customerName,
  projects,
  projectFinancials,
  customerPayments,
  addressPlaceholder,
  onOpenProjects,
}: {
  tab: CustomerDetailsTab;
  customerId: string;
  customerName: string;
  projects: Project[];
  projectFinancials: CustomerProjectFinancial[];
  customerPayments: CustomerPaymentListItem[];
  addressPlaceholder: string | null;
  onOpenProjects: () => void;
}) {
  if (tab === "overview") {
    const recent = projects.slice(0, 5);
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Overview
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {customerName}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Recent projects use live data. Open Financial or Payments for
            real balances and payment history across this customer&apos;s
            projects.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Recent Projects
            </h3>
            {projects.length > 0 ? (
              <button
                type="button"
                onClick={onOpenProjects}
                className="text-xs font-semibold text-accent hover:text-blue-400"
              >
                View all ({projects.length})
              </button>
            ) : null}
          </div>

          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No projects yet. When a quote for this customer is accepted, a
              project is created automatically.
            </p>
          ) : (
            <div className="mt-4">
              <ProjectList
                customerId={customerId}
                projects={recent}
                addressPlaceholder={addressPlaceholder}
                dense
              />
            </div>
          )}
        </section>
      </div>
    );
  }

  if (tab === "projects") {
    return (
      <ProjectsTab
        customerId={customerId}
        projects={projects}
        addressPlaceholder={addressPlaceholder}
      />
    );
  }

  if (tab === "financial") {
    return (
      <FinancialTab
        customerId={customerId}
        financials={projectFinancials}
      />
    );
  }

  if (tab === "payments") {
    return (
      <PaymentsTab
        customerId={customerId}
        payments={customerPayments}
      />
    );
  }

  const label =
    CUSTOMER_DETAILS_TABS.find((item) => item.id === tab)?.label ?? tab;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-white">{label}</h2>
      <p className="mt-2 text-sm text-slate-400">
        Coming in a later stage — placeholder content only.
      </p>
    </div>
  );
}

function FinancialTab({
  customerId,
  financials,
}: {
  customerId: string;
  financials: CustomerProjectFinancial[];
}) {
  if (financials.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Financial</h2>
        <p className="mt-2 text-sm text-slate-400">
          No projects yet — financial summaries appear once this customer has
          projects.
        </p>
      </div>
    );
  }

  const rollup = financials.reduce(
    (acc, row) => ({
      contractValue: acc.contractValue + row.contractValue,
      customerPayments: acc.customerPayments + row.customerPayments,
      outstanding: acc.outstanding + Math.max(0, row.outstandingCustomerBalance),
      totalCost: acc.totalCost + row.totalProjectCost,
      grossProfit: acc.grossProfit + row.grossProfit,
    }),
    {
      contractValue: 0,
      customerPayments: 0,
      outstanding: 0,
      totalCost: 0,
      grossProfit: 0,
    }
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-semibold text-white">
          Financial summary
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Rollup across {financials.length} project
          {financials.length === 1 ? "" : "s"}. Outstanding sums only amounts
          still owed (overpayments excluded).
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FinancialMetric
            label="Contract Value"
            value={formatCustomerMoney(rollup.contractValue)}
          />
          <FinancialMetric
            label="Customer Payments"
            value={formatCustomerMoney(rollup.customerPayments)}
          />
          <FinancialMetric
            label="Outstanding"
            value={formatCustomerMoney(rollup.outstanding)}
            tone={rollup.outstanding > 0 ? "negative" : "default"}
          />
          <FinancialMetric
            label="Total Costs"
            value={formatCustomerMoney(rollup.totalCost)}
          />
          <FinancialMetric
            label="Gross Profit"
            value={formatCustomerMoney(rollup.grossProfit)}
            tone={
              rollup.grossProfit > 0
                ? "positive"
                : rollup.grossProfit < 0
                  ? "negative"
                  : "default"
            }
          />
        </dl>
      </section>

      <ul className="space-y-3">
        {financials.map((row) => {
          const owed = row.outstandingCustomerBalance > 0;
          const overpaid = row.outstandingCustomerBalance < 0;
          return (
            <li
              key={row.projectId}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{row.projectName}</p>
                    <ProjectStatusBadge status={row.status} />
                  </div>
                  <Link
                    href={`/dashboard/customers/${customerId}/projects/${row.projectId}`}
                    className="mt-1 inline-block text-xs font-semibold text-accent hover:text-blue-400"
                  >
                    Open project →
                  </Link>
                </div>
                <p
                  className={`shrink-0 text-sm font-semibold ${
                    owed
                      ? "text-red-300"
                      : overpaid
                        ? "text-emerald-300"
                        : "text-slate-200"
                  }`}
                >
                  {owed
                    ? `Owes ${formatCustomerMoney(row.outstandingCustomerBalance)}`
                    : overpaid
                      ? `Overpaid ${formatCustomerMoney(
                          Math.abs(row.outstandingCustomerBalance)
                        )}`
                      : "Paid in full"}
                </p>
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <FinancialMetric
                  label="Contract Value"
                  value={formatCustomerMoney(row.contractValue)}
                  compact
                />
                <FinancialMetric
                  label="Payments"
                  value={formatCustomerMoney(row.customerPayments)}
                  compact
                />
                <FinancialMetric
                  label="Outstanding"
                  value={formatCustomerMoney(row.outstandingCustomerBalance)}
                  compact
                  tone={
                    owed ? "negative" : overpaid ? "positive" : "default"
                  }
                />
                <FinancialMetric
                  label="Total Costs"
                  value={formatCustomerMoney(row.totalProjectCost)}
                  compact
                />
                <FinancialMetric
                  label="Gross Profit"
                  value={formatCustomerMoney(row.grossProfit)}
                  compact
                  tone={
                    row.grossProfit > 0
                      ? "positive"
                      : row.grossProfit < 0
                        ? "negative"
                        : "default"
                  }
                />
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FinancialMetric({
  label,
  value,
  compact,
  tone = "default",
}: {
  label: string;
  value: string;
  compact?: boolean;
  tone?: "default" | "positive" | "negative";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-red-300"
        : "text-white";

  return (
    <div
      className={
        compact
          ? ""
          : "rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
      }
    >
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 font-semibold ${valueClass} ${compact ? "text-sm" : "text-base"}`}>
        {value}
      </dd>
    </div>
  );
}

function PaymentsTab({
  customerId,
  payments,
}: {
  customerId: string;
  payments: CustomerPaymentListItem[];
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Payments</h2>
        <p className="mt-2 text-sm text-slate-400">
          No payments recorded yet across this customer&apos;s projects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">
        Payments ({payments.length})
      </h2>
      <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        {payments.map((payment) => {
          const isCustomer = payment.paymentType === "customer_payment";
          return (
            <li
              key={payment.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                      isCustomer
                        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                        : "bg-amber-500/15 text-amber-200 ring-amber-500/30"
                    }`}
                  >
                    {isCustomer ? "Customer" : "Supplier"}
                  </span>
                  <p className="text-sm font-medium text-white">
                    {formatCustomerDate(payment.paymentDate)}
                  </p>
                </div>
                <p className="mt-1 truncate text-sm text-slate-400">
                  <Link
                    href={`/dashboard/customers/${customerId}/projects/${payment.projectId}`}
                    className="font-medium text-slate-300 hover:text-accent"
                  >
                    {payment.projectName}
                  </Link>
                  {payment.notes ? (
                    <span className="text-slate-500"> · {payment.notes}</span>
                  ) : null}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-white">
                {formatCustomerMoney(payment.amount)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${projectStatusClass(status)}`}
    >
      {projectStatusLabel(status)}
    </span>
  );
}

function ProjectsTab({
  customerId,
  projects,
  addressPlaceholder,
}: {
  customerId: string;
  projects: Project[];
  addressPlaceholder: string | null;
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Projects</h2>
        <p className="mt-2 text-sm text-slate-400">
          No projects for this customer yet. Accepting a quote creates one
          automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">
          Projects ({projects.length})
        </h2>
      </div>
      <ProjectList
        customerId={customerId}
        projects={projects}
        addressPlaceholder={addressPlaceholder}
      />
    </div>
  );
}

function ProjectList({
  customerId,
  projects,
  addressPlaceholder,
  dense = false,
}: {
  customerId: string;
  projects: Project[];
  addressPlaceholder: string | null;
  dense?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ul className={dense ? "space-y-2" : "space-y-3"}>
      {projects.map((project) => {
        const expanded = expandedId === project.id;
        return (
          <ProjectCard
            key={project.id}
            customerId={customerId}
            project={project}
            addressPlaceholder={addressPlaceholder}
            expanded={expanded}
            dense={dense}
            onToggle={() =>
              setExpandedId((current) =>
                current === project.id ? null : project.id
              )
            }
          />
        );
      })}
    </ul>
  );
}

function ProjectCard({
  customerId,
  project,
  addressPlaceholder,
  expanded,
  dense,
  onToggle,
}: {
  customerId: string;
  project: Project;
  addressPlaceholder: string | null;
  expanded: boolean;
  dense?: boolean;
  onToggle: () => void;
}) {
  const materials = asProjectMaterials(project.materials);
  const labour = asProjectLabour(project.labour_items);
  const name = project.project_name?.trim() || "Untitled project";
  const projectCustomerId = project.customer_id || customerId;
  const projectDetailHref = `/dashboard/customers/${projectCustomerId}/projects/${project.id}`;

  return (
    <li className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div
        className={`flex items-stretch gap-2 ${
          dense ? "px-3 py-3 sm:px-4" : "px-4 py-4 sm:px-5"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex-1 rounded-xl text-left transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`font-semibold text-white ${
                    dense ? "text-sm" : "text-base"
                  }`}
                >
                  {name}
                </p>
                <ProjectStatusBadge status={project.status} />
              </div>
              <p
                className={`mt-1 text-slate-400 ${dense ? "text-xs" : "text-sm"}`}
              >
                {addressPlaceholder || "Address TBD"}
                <span className="mx-2 text-slate-600">·</span>
                Started {formatProjectDate(project.start_date)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={`font-semibold text-white ${
                  dense ? "text-sm" : "text-base"
                }`}
              >
                {formatProjectMoney(Number(project.value))}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                {expanded ? "Hide details" : "View details"}
              </p>
            </div>
          </div>
        </button>

        <Link
          href={projectDetailHref}
          aria-label={`Open project ${name}`}
          className={`inline-flex shrink-0 items-center justify-center gap-1.5 self-center rounded-xl border border-accent/40 bg-accent/15 px-3 font-semibold text-accent transition hover:border-accent hover:bg-accent/25 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
            dense ? "min-h-[36px] text-xs" : "min-h-[40px] text-sm"
          }`}
        >
          Open Project
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {expanded ? (
        <div className="border-t border-white/10 px-4 py-4 sm:px-5">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Status
              </dt>
              <dd className="mt-1">
                <ProjectStatusBadge status={project.status} />
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Value
              </dt>
              <dd className="mt-1 text-sm font-medium text-white">
                {formatProjectMoney(Number(project.value))}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Start date
              </dt>
              <dd className="mt-1 text-sm text-slate-200">
                {formatProjectDate(project.start_date)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                End date
              </dt>
              <dd className="mt-1 text-sm text-slate-200">
                {formatProjectDate(project.end_date)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Materials snapshot
              </p>
              {materials.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No materials on the accepted quote.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {materials.map((item, index) => (
                    <li
                      key={`${item.item}-${index}`}
                      className="text-sm text-slate-300"
                    >
                      {item.quantity} {item.unit} {item.item || "Material"}
                      {item.brand ? ` (${item.brand})` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Labour snapshot
              </p>
              {labour.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No labour on the accepted quote.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {labour.map((item, index) => (
                    <li
                      key={`${item.description}-${index}`}
                      className="text-sm text-slate-300"
                    >
                      {item.hours}h {item.description || "Labour"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm">
            {project.quote_id ? (
              <Link
                href={`/dashboard/quotes?quote=${project.quote_id}`}
                className="font-semibold text-accent hover:text-blue-400"
                onClick={(event) => event.stopPropagation()}
              >
                Open linked quote
              </Link>
            ) : (
              <span className="text-slate-500">No linked quote</span>
            )}
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">
              Quote ref:{" "}
              <span className="font-mono text-slate-300">
                {project.quote_id
                  ? `${project.quote_id.slice(0, 8)}…`
                  : "—"}
              </span>
            </span>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function CustomerSummaryCard({
  customer,
}: {
  customer: CustomerDetailsViewModel;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Full Name", value: customer.fullName },
    { label: "Company", value: customer.company || "—" },
    { label: "Phone", value: customer.phone || "—" },
    { label: "Email", value: customer.email || "—" },
    { label: "Address", value: customer.address || "—" },
    {
      label: "Customer Since",
      value: formatCustomerDate(customer.customerSince),
    },
    {
      label: "Last Contact",
      value: formatCustomerDate(customer.lastContactAt),
    },
    { label: "Preferred Contact", value: customer.preferredContact },
    { label: "Customer Source", value: customer.customerSource },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Customer Summary
      </h2>
      <dl className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {row.label}
            </dt>
            <dd className="mt-0.5 break-words text-sm text-slate-200">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Tags
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {customer.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent ring-1 ring-accent/25"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Notes
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">
          {customer.notes || "No notes yet."}
        </p>
      </div>
    </section>
  );
}

function LocationsCard({
  customer,
  onViewAll,
}: {
  customer: CustomerDetailsViewModel;
  onViewAll: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Locations ({customer.locations.length})
        </h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-accent hover:text-blue-400"
        >
          View all
        </button>
      </div>

      <div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-dashed border-white/15 bg-gradient-to-br from-slate-800/80 via-navy to-cyan-950/40">
        <div className="text-center">
          <IconMapPin className="mx-auto h-6 w-6 text-cyan-400/80" />
          <p className="mt-1 text-xs text-slate-500">Map placeholder</p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {customer.locations.map((location) => (
          <li
            key={location.id}
            className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white">{location.label}</p>
              {location.isPrimary ? (
                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300 ring-1 ring-cyan-500/30">
                  Primary
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {location.address}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActivityTimelineCard({
  items,
  onViewFull,
}: {
  items: CustomerActivityItem[];
  onViewFull: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Activity Timeline
        </h2>
        <button
          type="button"
          onClick={onViewFull}
          className="text-xs font-semibold text-accent hover:text-blue-400"
        >
          View Full Timeline
        </button>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${activityAccent(item.type)}`}
            >
              <ActivityIcon type={item.type} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white">{item.title}</p>
                {typeof item.amount === "number" ? (
                  <p className="shrink-0 text-sm font-semibold text-slate-200">
                    {formatCustomerMoney(item.amount)}
                  </p>
                ) : null}
              </div>
              {item.description ? (
                <p className="mt-0.5 text-xs text-slate-400">
                  {item.description}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-slate-500">
                {formatCustomerDate(item.occurredAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
