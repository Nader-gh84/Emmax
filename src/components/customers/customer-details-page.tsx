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
}: {
  customer: CustomerDetailsViewModel;
}) {
  const [activeTab, setActiveTab] = useState<CustomerDetailsTab>("overview");
  const [moreOpen, setMoreOpen] = useState(false);
  const initials = useMemo(
    () => getCustomerInitials(customer.fullName),
    [customer.fullName]
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

      {customer.outstanding && customer.outstanding.overdueInvoiceCount > 0 ? (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-300">
                Outstanding Balance
              </p>
              <p className="mt-1 text-sm text-red-100/90">
                This customer has {customer.outstanding.overdueInvoiceCount}{" "}
                overdue invoice
                {customer.outstanding.overdueInvoiceCount === 1 ? "" : "s"}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-bold text-white">
                {formatCustomerMoney(customer.outstanding.totalOverdue)}
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
                  ? customer.counts[tab.countKey]
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
            <TabPanel tab={activeTab} customerName={customer.fullName} />
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-80 xl:w-96">
          <CustomerSummaryCard customer={customer} />
          <LocationsCard customer={customer} onViewAll={() => setActiveTab("locations")} />
          <ActivityTimelineCard
            items={customer.recentActivity}
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
  customerName,
}: {
  tab: CustomerDetailsTab;
  customerName: string;
}) {
  if (tab === "overview") {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Overview
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Stage 1 shell for {customerName}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Financial overview cards, recent projects, outstanding invoices,
          payment history, and the revenue chart land in Stage 2. This tab is a
          placeholder so header, tabs, and the right sidebar can be reviewed
          first.
        </p>
      </div>
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
