"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { RecordSupplierPaymentModal } from "@/components/suppliers/detail/record-supplier-payment-modal";
import { SupplierSummaryCards } from "@/components/suppliers/detail/supplier-summary-cards";
import { SupplierFormModal } from "@/components/suppliers/supplier-form-modal";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { googleMapsSearchUrl } from "@/lib/customer-details";
import {
  SUPPLIER_DETAILS_TABS,
  formatSupplierMoney,
  type SupplierDetailsTab,
  type SupplierDetailsViewModel,
  type SupplierInvoice,
} from "@/lib/supplier-details-mock";
import {
  createSupplierLogoSignedUrl,
  deleteSupplierLogoFile,
  uploadSupplierLogo,
} from "@/lib/supplier-logo-storage";
import {
  confirmSupplierInvoice,
  recordSupplierPayment,
} from "@/lib/supplier-payment-actions";
import { createClient } from "@/lib/supabase";
import {
  isSupplierPaymentTermsType,
  type Supplier,
  type SupplierFormData,
  type SupplierPaymentTermsType,
} from "@/types/supplier";

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

function ContactChip({
  label,
  icon,
  value,
  href,
  external,
}: {
  label: string;
  icon: React.ReactNode;
  value: string | null;
  href?: string;
  external?: boolean;
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
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
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
  external,
}: {
  label: string;
  icon: React.ReactNode;
  href?: string;
  external?: boolean;
}) {
  const className =
    "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

  if (href) {
    return (
      <a
        href={href}
        className={className}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
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

function supplierToForm(supplier: Supplier): SupplierFormData {
  const terms = supplier.payment_terms_type;
  return {
    supplier_name: supplier.supplier_name,
    contact_person: supplier.contact_person ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    location: supplier.location ?? "",
    preferred_order_method: supplier.preferred_order_method ?? "",
    credit_limit:
      supplier.credit_limit != null && !Number.isNaN(Number(supplier.credit_limit))
        ? String(supplier.credit_limit)
        : "",
    minimum_monthly_payment:
      supplier.minimum_monthly_payment != null &&
      !Number.isNaN(Number(supplier.minimum_monthly_payment))
        ? String(supplier.minimum_monthly_payment)
        : "",
    payment_terms_type: isSupplierPaymentTermsType(String(terms ?? ""))
      ? (terms as SupplierPaymentTermsType)
      : "net_30",
    default_account_number: supplier.default_account_number ?? "",
  };
}

function parseOptionalMoney(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function formToPayload(form: SupplierFormData) {
  return {
    supplier_name: form.supplier_name.trim(),
    contact_person: form.contact_person.trim() || null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    location: form.location.trim() || null,
    preferred_order_method: form.preferred_order_method.trim() || null,
    credit_limit: parseOptionalMoney(form.credit_limit),
    minimum_monthly_payment: parseOptionalMoney(form.minimum_monthly_payment),
    payment_terms_type: isSupplierPaymentTermsType(form.payment_terms_type)
      ? form.payment_terms_type
      : "net_30",
    default_account_number: form.default_account_number.trim() || null,
  };
}

export function SupplierDetailsPage({
  supplier,
  supplierRecord,
}: {
  supplier: SupplierDetailsViewModel;
  supplierRecord: Supplier;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SupplierDetailsTab>("invoices");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [preselectedInvoiceIds, setPreselectedInvoiceIds] = useState<string[]>(
    []
  );
  const [showEdit, setShowEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<SupplierFormData>(() =>
    supplierToForm(supplierRecord)
  );
  const [editError, setEditError] = useState<string | null>(null);

  function openPaymentModal(invoice?: SupplierInvoice) {
    setPaymentError(null);
    setActionError(null);
    setPreselectedInvoiceIds(invoice ? [invoice.id] : []);
    setPaymentModalOpen(true);
  }

  async function handleConfirmInvoice(invoice: SupplierInvoice) {
    if (invoice.dbStatus !== "pending_confirmation") return;
    setConfirmingId(invoice.id);
    setActionError(null);
    setActionSuccess(null);

    const supabase = createClient();
    const result = await confirmSupplierInvoice(supabase, {
      invoiceId: invoice.id,
      supplierId: supplier.id,
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

    const result = await recordSupplierPayment(supabase, {
      supplierId: supplier.id,
      userId: user.id,
      amount: input.amount,
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      selectedInvoiceIds: input.selectedInvoiceIds,
      invoices: supplier.invoices,
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

  async function handleSaveSupplier(
    form: SupplierFormData,
    options?: { logoFile?: File | null; removeLogo?: boolean }
  ) {
    setIsSaving(true);
    setEditError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEditError("You must be logged in to save suppliers.");
      setIsSaving(false);
      return;
    }

    let nextLogoPath: string | null | undefined;
    const previousPath = supplierRecord.logo_url ?? null;

    if (options?.removeLogo) {
      nextLogoPath = null;
    } else if (options?.logoFile) {
      const uploadResult = await uploadSupplierLogo({
        userId: user.id,
        supplierId: supplierRecord.id,
        file: options.logoFile,
      });
      if ("error" in uploadResult) {
        setEditError(uploadResult.error);
        setIsSaving(false);
        return;
      }
      nextLogoPath = uploadResult.path;
    }

    const { error } = await supabase
      .from("suppliers")
      .update({
        ...formToPayload(form),
        ...(nextLogoPath !== undefined ? { logo_url: nextLogoPath } : {}),
      })
      .eq("id", supplierRecord.id)
      .eq("user_id", user.id);

    if (error) {
      if (nextLogoPath) await deleteSupplierLogoFile(nextLogoPath);
      setEditError("Failed to update supplier. Please try again.");
      setIsSaving(false);
      return;
    }

    if (
      (options?.removeLogo || options?.logoFile) &&
      previousPath &&
      previousPath !== nextLogoPath
    ) {
      await deleteSupplierLogoFile(previousPath);
    }

    setIsSaving(false);
    setShowEdit(false);
    router.refresh();
  }

  const outstanding = Math.max(0, supplier.summary.outstandingBalance);

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
              <EntityAvatar
                name={supplier.name}
                size="lg"
                imagePath={supplier.logoUrl}
                resolveImageUrl={createSupplierLogoSignedUrl}
                className="shadow-lg shadow-accent/25"
              />
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
                    href={
                      supplier.address
                        ? googleMapsSearchUrl(supplier.address)
                        : undefined
                    }
                    external
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <ActionButton
                    label="Call"
                    icon={<IconPhone className="h-4 w-4" />}
                    href={supplier.phone ? `tel:${supplier.phone}` : undefined}
                  />
                  <ActionButton
                    label="Email"
                    icon={<IconMail className="h-4 w-4" />}
                    href={
                      supplier.email ? `mailto:${supplier.email}` : undefined
                    }
                  />
                  <ActionButton
                    label="Message"
                    icon={<IconMessage className="h-4 w-4" />}
                    href={supplier.phone ? `sms:${supplier.phone}` : undefined}
                  />
                  <ActionButton
                    label="Direction"
                    icon={<IconMapPin className="h-4 w-4" />}
                    href={
                      supplier.address
                        ? googleMapsSearchUrl(supplier.address)
                        : undefined
                    }
                    external
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
            <button
              type="button"
              className={touchBtnSecondary}
              onClick={() => {
                setEditForm(supplierToForm(supplierRecord));
                setEditError(null);
                setShowEdit(true);
              }}
            >
              Edit Supplier
            </button>
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

      {outstanding > 0 ? (
        <div className="border-b border-amber-500/25 bg-gradient-to-r from-amber-500/15 via-red-500/10 to-transparent px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-200">
                Outstanding Balance
              </p>
              <p className="mt-1 text-sm text-amber-50/80">
                {supplier.summary.confirmedInvoiceCount} confirmed invoice
                {supplier.summary.confirmedInvoiceCount === 1 ? "" : "s"} with
                unpaid balance
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-bold text-white">
                {formatSupplierMoney(outstanding)}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("invoices")}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/20 px-4 text-sm font-semibold text-amber-50 transition hover:bg-amber-500/30"
              >
                View Invoices
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {(actionError || actionSuccess) && (
        <div className="px-4 pt-4 sm:px-6 lg:px-8">
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
        <SupplierSummaryCards summary={supplier.summary} />

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-5">
            <div className="overflow-x-auto border-b border-white/10">
              <div className="flex min-w-max gap-1 pb-px">
                {SUPPLIER_DETAILS_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const count =
                    tab.id === "invoices"
                      ? supplier.invoices.length
                      : tab.id === "payments"
                        ? supplier.payments.length
                        : null;
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

            <div>
              {activeTab === "invoices" ? (
                <SupplierInvoicesTab
                  invoices={supplier.invoices}
                  confirmingId={confirmingId}
                  onConfirmInvoice={(invoice) =>
                    void handleConfirmInvoice(invoice)
                  }
                  onRecordPayment={(invoice) => openPaymentModal(invoice)}
                />
              ) : null}
              {activeTab === "payments" ? (
                <SupplierPaymentsPlaceholder
                  payments={supplier.payments}
                  onRecordPayment={() => openPaymentModal()}
                />
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
              onRecordPayment={() => openPaymentModal()}
            />
          </div>
        </div>

        <SupplierDocumentsSection documents={supplier.documents} />
      </div>

      <RecordSupplierPaymentModal
        open={paymentModalOpen}
        invoices={supplier.invoices}
        initialSelectedInvoiceIds={preselectedInvoiceIds}
        busy={paymentBusy}
        error={paymentError}
        onClose={() => {
          if (!paymentBusy) setPaymentModalOpen(false);
        }}
        onSubmit={handleRecordPayment}
      />

      {showEdit ? (
        <div>
          {editError ? (
            <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
              <p className="rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm text-red-100 shadow-lg">
                {editError}
              </p>
            </div>
          ) : null}
          <SupplierFormModal
            title="Edit Supplier"
            initialForm={editForm}
            isSaving={isSaving}
            onClose={() => {
              if (!isSaving) setShowEdit(false);
            }}
            onSubmit={handleSaveSupplier}
            supplierId={supplierRecord.id}
            currentLogoPath={supplierRecord.logo_url}
          />
        </div>
      ) : null}
    </div>
  );
}
