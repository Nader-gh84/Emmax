"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SuppliersEmptyState } from "@/components/dashboard/suppliers-empty-state";
import {
  IconDocument,
  IconUsers,
} from "@/components/dashboard/icons";
import {
  IconMail,
  IconMore,
  IconPhone,
  IconSearch,
} from "@/components/dashboard/workspace-icons";
import { SupplierFormModal } from "@/components/suppliers/supplier-form-modal";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { formatSupplierMoney } from "@/lib/supplier-details-mock";
import {
  createSupplierLogoSignedUrl,
  deleteSupplierLogoFile,
  uploadSupplierLogo,
} from "@/lib/supplier-logo-storage";
import { createClient } from "@/lib/supabase";
import {
  EMPTY_SUPPLIER_FORM,
  isSupplierPaymentTermsType,
  type Supplier,
  type SupplierFormData,
  type SupplierPaymentTermsType,
} from "@/types/supplier";

type SupplierListItem = Supplier & {
  totalPurchases: number;
  outstandingBalance: number;
  invoiceCount: number;
};

type SortOption = "recent" | "name_asc" | "name_desc" | "outstanding";
type BalanceFilter = "all" | "outstanding";
type ViewMode = "grid" | "list";

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

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function IconList({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function StatsRow({
  totalSuppliers,
  withOutstanding,
  totalPurchases,
  totalOutstanding,
}: {
  totalSuppliers: number;
  withOutstanding: number;
  totalPurchases: number;
  totalOutstanding: number;
}) {
  const cards = [
    {
      id: "total",
      label: "Total Suppliers",
      value: String(totalSuppliers),
      icon: <IconUsers className="h-5 w-5" />,
      iconClass: "bg-accent/15 text-accent ring-accent/30",
    },
    {
      id: "outstanding-count",
      label: "With Outstanding",
      value: String(withOutstanding),
      icon: <IconBuilding className="h-5 w-5" />,
      iconClass: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
    },
    {
      id: "purchases",
      label: "Total Purchases",
      value: formatSupplierMoney(totalPurchases),
      icon: <IconDocument className="h-5 w-5" />,
      iconClass: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
    },
    {
      id: "outstanding",
      label: "Outstanding",
      value: formatSupplierMoney(totalOutstanding),
      icon: <IconDocument className="h-5 w-5" />,
      iconClass: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <section
          key={card.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${card.iconClass}`}
            >
              {card.icon}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-white">
            {card.value}
          </p>
        </section>
      ))}
    </div>
  );
}

function SupplierCard({
  supplier,
  viewMode,
  isDeleting,
  onEdit,
  onDelete,
}: {
  supplier: SupplierListItem;
  viewMode: ViewMode;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasOutstanding = supplier.outstandingBalance > 0.009;

  return (
    <article
      className={`relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${
        viewMode === "list" ? "sm:flex sm:items-stretch sm:gap-6" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
        aria-label={`More actions for ${supplier.supplier_name}`}
      >
        <IconMore className="h-4 w-4" />
      </button>
      {menuOpen ? (
        <div className="absolute right-3 top-12 z-20 w-40 overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
          <Link
            href={`/dashboard/suppliers/${supplier.id}`}
            className="block px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            onClick={() => setMenuOpen(false)}
          >
            View details
          </Link>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onEdit();
            }}
            className="block w-full px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="block w-full px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      ) : null}

      <div className={viewMode === "list" ? "min-w-0 flex-1" : ""}>
        <div className="flex items-start gap-3 pr-10">
          <EntityAvatar
            name={supplier.supplier_name}
            size="md"
            imagePath={supplier.logo_url}
            resolveImageUrl={createSupplierLogoSignedUrl}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-white">
                {supplier.supplier_name}
              </h3>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                  hasOutstanding
                    ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                }`}
              >
                {hasOutstanding ? "Outstanding" : "Current"}
              </span>
            </div>
            {supplier.contact_person ? (
              <p className="mt-1 truncate text-sm text-slate-400">
                {supplier.contact_person}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={`mt-4 flex gap-4 ${
            viewMode === "list"
              ? "flex-col sm:flex-row sm:items-center sm:justify-between"
              : "flex-col"
          }`}
        >
          <div className="min-w-0 space-y-2 text-sm text-slate-300">
            <p className="flex items-center gap-2 truncate">
              <IconMail className="h-4 w-4 shrink-0 text-cyan-400/90" />
              <span className="truncate">{supplier.email || "—"}</span>
            </p>
            <p className="flex items-center gap-2 truncate">
              <IconPhone className="h-4 w-4 shrink-0 text-cyan-400/90" />
              <span className="truncate">{supplier.phone || "—"}</span>
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-1 text-sm text-slate-300 sm:items-end">
            <p>
              <span className="text-slate-500">Purchases </span>
              <span className="font-semibold text-white">
                {formatSupplierMoney(supplier.totalPurchases)}
              </span>
            </p>
            <p>
              <span className="text-slate-500">Outstanding </span>
              <span
                className={`font-semibold ${
                  hasOutstanding ? "text-amber-200" : "text-white"
                }`}
              >
                {formatSupplierMoney(Math.max(0, supplier.outstandingBalance))}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div
        className={`mt-5 flex flex-col gap-2 sm:flex-row ${
          viewMode === "list" ? "sm:mt-0 sm:shrink-0 sm:items-center" : ""
        }`}
      >
        <Link
          href={`/dashboard/suppliers/${supplier.id}`}
          className={`${touchBtnSecondary} w-full sm:w-auto`}
        >
          View
        </Link>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-accent/40 px-6 text-base font-medium text-accent transition hover:bg-accent/10 sm:w-auto"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-red-500/30 px-6 text-base font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </article>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(EMPTY_SUPPLIER_FORM);
  const [search, setSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const loadSuppliers = useCallback(async () => {
    setError(null);

    const supabase = createClient();
    const [
      { data: supplierData, error: fetchError },
      { data: invoiceData },
      { data: paymentData },
    ] = await Promise.all([
      supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("supplier_invoices")
        .select("supplier_id, amount, status"),
      supabase.from("supplier_payments").select("supplier_id, amount"),
    ]);

    if (fetchError) {
      setError("Failed to load suppliers. Please try again.");
      return;
    }

    const purchasesBySupplier = new Map<string, number>();
    const invoicesBySupplier = new Map<string, number>();
    for (const invoice of (invoiceData as
      | { supplier_id: string; amount: number; status: string }[]
      | null) ?? []) {
      if (invoice.status !== "confirmed") continue;
      purchasesBySupplier.set(
        invoice.supplier_id,
        (purchasesBySupplier.get(invoice.supplier_id) ?? 0) +
          (Number(invoice.amount) || 0)
      );
      invoicesBySupplier.set(
        invoice.supplier_id,
        (invoicesBySupplier.get(invoice.supplier_id) ?? 0) + 1
      );
    }

    const paidBySupplier = new Map<string, number>();
    for (const payment of (paymentData as
      | { supplier_id: string; amount: number }[]
      | null) ?? []) {
      paidBySupplier.set(
        payment.supplier_id,
        (paidBySupplier.get(payment.supplier_id) ?? 0) +
          (Number(payment.amount) || 0)
      );
    }

    const rows = ((supplierData as Supplier[] | null) ?? []).map(
      (supplier) => {
        const totalPurchases = purchasesBySupplier.get(supplier.id) ?? 0;
        const totalPaid = paidBySupplier.get(supplier.id) ?? 0;
        return {
          ...supplier,
          totalPurchases,
          outstandingBalance: totalPurchases - totalPaid,
          invoiceCount: invoicesBySupplier.get(supplier.id) ?? 0,
        };
      }
    );

    setSuppliers(rows);
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadSuppliers();
      setIsLoading(false);
    }
    void init();
  }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = [...suppliers];

    if (balanceFilter === "outstanding") {
      rows = rows.filter((row) => row.outstandingBalance > 0.009);
    }

    if (query) {
      rows = rows.filter((row) => {
        return (
          row.supplier_name.toLowerCase().includes(query) ||
          (row.contact_person ?? "").toLowerCase().includes(query) ||
          (row.email ?? "").toLowerCase().includes(query) ||
          (row.phone ?? "").toLowerCase().includes(query)
        );
      });
    }

    rows.sort((a, b) => {
      if (sortBy === "name_desc") {
        return b.supplier_name.localeCompare(a.supplier_name);
      }
      if (sortBy === "outstanding") {
        return b.outstandingBalance - a.outstandingBalance;
      }
      if (sortBy === "recent") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return a.supplier_name.localeCompare(b.supplier_name);
    });

    return rows;
  }, [suppliers, search, balanceFilter, sortBy]);

  function openAddForm() {
    setEditingSupplier(null);
    setFormData(EMPTY_SUPPLIER_FORM);
    setShowForm(true);
    setSuccess(null);
    setError(null);
  }

  function openEditForm(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormData(supplierToForm(supplier));
    setShowForm(true);
    setSuccess(null);
    setError(null);
  }

  function closeForm() {
    if (isSaving) return;
    setShowForm(false);
    setEditingSupplier(null);
    setFormData(EMPTY_SUPPLIER_FORM);
  }

  async function handleSave(
    form: SupplierFormData,
    options?: { logoFile?: File | null; removeLogo?: boolean }
  ) {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to save suppliers.");
      setIsSaving(false);
      return;
    }

    const payload = formToPayload(form);

    if (editingSupplier) {
      let nextLogoPath: string | null | undefined;
      const previousPath = editingSupplier.logo_url ?? null;

      if (options?.removeLogo) {
        nextLogoPath = null;
      } else if (options?.logoFile) {
        const uploadResult = await uploadSupplierLogo({
          userId: user.id,
          supplierId: editingSupplier.id,
          file: options.logoFile,
        });
        if ("error" in uploadResult) {
          setError(uploadResult.error);
          setIsSaving(false);
          return;
        }
        nextLogoPath = uploadResult.path;
      }

      const { error: updateError } = await supabase
        .from("suppliers")
        .update({
          ...payload,
          ...(nextLogoPath !== undefined ? { logo_url: nextLogoPath } : {}),
        })
        .eq("id", editingSupplier.id)
        .eq("user_id", user.id);

      if (updateError) {
        if (nextLogoPath) await deleteSupplierLogoFile(nextLogoPath);
        const hint =
          updateError.message?.includes("logo_url") ||
          updateError.message?.includes("column")
            ? " Run migration 040 in Supabase."
            : "";
        setError(`Failed to update supplier.${hint}`);
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

      setSuccess("Supplier updated!");
    } else {
      const { error: insertError } = await supabase.from("suppliers").insert({
        ...payload,
        user_id: user.id,
      });

      if (insertError) {
        const hint =
          insertError.message?.includes("credit_limit") ||
          insertError.message?.includes("payment_terms_type") ||
          insertError.message?.includes("column")
            ? " Run migration 036/040 in Supabase."
            : "";
        setError(`Failed to add supplier.${hint}`);
        setIsSaving(false);
        return;
      }

      setSuccess("Supplier added!");
    }

    await loadSuppliers();
    setIsSaving(false);
    setShowForm(false);
    setEditingSupplier(null);
    setFormData(EMPTY_SUPPLIER_FORM);
  }

  async function handleDelete(supplier: Supplier) {
    const confirmed = window.confirm(
      `Delete ${supplier.supplier_name}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(supplier.id);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", supplier.id);

    if (deleteError) {
      setError("Failed to delete supplier. Please try again.");
      setDeletingId(null);
      return;
    }

    if (supplier.logo_url) {
      await deleteSupplierLogoFile(supplier.logo_url);
    }

    setSuccess("Supplier deleted.");
    await loadSuppliers();
    setDeletingId(null);
  }

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 lg:p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
        <p className="mt-4 text-base text-slate-400">Loading suppliers...</p>
      </main>
    );
  }

  if (suppliers.length === 0) {
    return (
      <main className="flex min-h-full flex-1 flex-col">
        {error && (
          <div className="mx-auto mt-6 w-full max-w-lg rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-auto mt-6 w-full max-w-lg rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-base text-green-400">
            {success}
          </div>
        )}

        <SuppliersEmptyState onAddSupplier={openAddForm} />

        {showForm && (
          <SupplierFormModal
            title="Add Supplier"
            initialForm={formData}
            isSaving={isSaving}
            onClose={closeForm}
            onSubmit={handleSave}
            supplierId={null}
          />
        )}
      </main>
    );
  }

  const withOutstanding = suppliers.filter(
    (row) => row.outstandingBalance > 0.009
  ).length;
  const totalPurchases = suppliers.reduce(
    (sum, row) => sum + row.totalPurchases,
    0
  );
  const totalOutstanding = suppliers.reduce(
    (sum, row) => sum + Math.max(0, row.outstandingBalance),
    0
  );

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Suppliers
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
              Manage material suppliers, purchases, and outstanding balances.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            className={`${touchBtnPrimary} w-full sm:w-auto`}
          >
            + Add Supplier
          </button>
        </div>

        {success && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-base text-green-400">
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
            {error}
          </div>
        )}

        <StatsRow
          totalSuppliers={suppliers.length}
          withOutstanding={withOutstanding}
          totalPurchases={totalPurchases}
          totalOutstanding={totalOutstanding}
        />

        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, contact, email, phone…"
              className={`${touchInput} pl-10`}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={balanceFilter}
              onChange={(event) =>
                setBalanceFilter(event.target.value as BalanceFilter)
              }
              className={`${touchInput} appearance-none sm:w-44`}
            >
              <option value="all">All suppliers</option>
              <option value="outstanding">With outstanding</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className={`${touchInput} appearance-none sm:w-44`}
            >
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
              <option value="recent">Recently added</option>
              <option value="outstanding">Highest outstanding</option>
            </select>
            <div className="inline-flex rounded-xl border border-white/10 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${
                  viewMode === "grid"
                    ? "bg-accent/20 text-accent"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-label="Grid view"
              >
                <IconGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${
                  viewMode === "list"
                    ? "bg-accent/20 text-accent"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-label="List view"
              >
                <IconList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
            <p className="text-sm text-slate-400">
              No suppliers match your search or filters.
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid gap-4 sm:grid-cols-2"
                : "flex flex-col gap-3"
            }
          >
            {filteredSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                viewMode={viewMode}
                isDeleting={deletingId === supplier.id}
                onEdit={() => openEditForm(supplier)}
                onDelete={() => void handleDelete(supplier)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <SupplierFormModal
          title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
          initialForm={formData}
          isSaving={isSaving}
          onClose={closeForm}
          onSubmit={handleSave}
          supplierId={editingSupplier?.id ?? null}
          currentLogoPath={editingSupplier?.logo_url ?? null}
        />
      )}
    </main>
  );
}
