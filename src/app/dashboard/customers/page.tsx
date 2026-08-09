"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomersEmptyState } from "@/components/dashboard/customers-empty-state";
import {
  IconDocument,
  IconUsers,
} from "@/components/dashboard/icons";
import {
  IconMail,
  IconMore,
  IconPhone,
  IconProjects,
  IconSearch,
} from "@/components/dashboard/workspace-icons";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import {
  createCustomerAvatarSignedUrl,
  deleteCustomerAvatarFile,
  uploadCustomerAvatar,
} from "@/lib/customer-avatar-storage";
import { pickContactForForm } from "@/lib/customer-contacts";
import { createClient } from "@/lib/supabase";
import { deriveCustomerStatus } from "@/lib/customer-details";
import {
  EMPTY_CUSTOMER_FORM,
  getCustomerDisplayName,
  isCustomerGender,
  type Customer,
  type CustomerFormData,
} from "@/types/customer";

type CustomerListItem = Customer & {
  quotesCount: number;
  projectsCount: number;
  /** Derived — no inactive status in schema yet. */
  isActive: boolean;
};

type SortOption = "recent" | "name_asc" | "name_desc";
type StatusFilter = "all" | "active";
type ViewMode = "grid" | "list";

function customerToForm(customer: Customer): CustomerFormData {
  return {
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    notes: customer.notes ?? "",
    customer_type:
      customer.customer_type === "commercial" ? "commercial" : "residential",
    website: customer.website ?? "",
    gender: isCustomerGender(String(customer.gender ?? ""))
      ? customer.gender
      : "unspecified",
  };
}

function formToPayload(form: CustomerFormData) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    notes: form.notes.trim() || null,
    customer_type: form.customer_type,
    website: form.website.trim() || null,
    gender: form.gender,
  };
}

function IconUserPlus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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
  totalCustomers,
  activeCustomers,
  quotesSent,
  projects,
}: {
  totalCustomers: number;
  activeCustomers: number;
  quotesSent: number;
  projects: number;
}) {
  const cards = [
    {
      id: "total",
      label: "Total Customers",
      value: totalCustomers,
      icon: <IconUsers className="h-5 w-5" />,
      iconClass: "bg-accent/15 text-accent ring-accent/30",
    },
    {
      id: "active",
      label: "Active Customers",
      value: activeCustomers,
      icon: <IconUserPlus className="h-5 w-5" />,
      iconClass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    },
    {
      id: "quotes",
      label: "Quotes Sent",
      value: quotesSent,
      icon: <IconDocument className="h-5 w-5" />,
      iconClass: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
    },
    {
      id: "projects",
      label: "Projects",
      value: projects,
      icon: <IconProjects className="h-5 w-5" />,
      iconClass: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
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

function CustomerCard({
  customer,
  viewMode,
  isDeleting,
  onEdit,
  onDelete,
}: {
  customer: CustomerListItem;
  viewMode: ViewMode;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayName = getCustomerDisplayName(customer);
  const [menuOpen, setMenuOpen] = useState(false);

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
        aria-label={`More actions for ${displayName}`}
      >
        <IconMore className="h-4 w-4" />
      </button>
      {menuOpen ? (
        <div className="absolute right-3 top-12 z-20 w-40 overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
          <Link
            href={`/dashboard/customers/${customer.id}`}
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
            name={displayName}
            size="md"
            imagePath={customer.avatar_url}
            resolveImageUrl={createCustomerAvatarSignedUrl}
            gender={
              isCustomerGender(String(customer.gender ?? ""))
                ? customer.gender
                : "unspecified"
            }
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-white">
                {displayName}
              </h3>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                  customer.isActive
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                    : "bg-slate-500/15 text-slate-300 ring-slate-500/30"
                }`}
              >
                {customer.isActive ? "Active" : "Inactive"}
              </span>
            </div>
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
              <span className="truncate">{customer.email || "—"}</span>
            </p>
            <p className="flex items-center gap-2 truncate">
              <IconPhone className="h-4 w-4 shrink-0 text-cyan-400/90" />
              <span className="truncate">{customer.phone || "—"}</span>
            </p>
          </div>

          <div className="flex shrink-0 gap-4 text-sm text-slate-300 sm:justify-end">
            <p className="inline-flex items-center gap-1.5">
              <IconDocument className="h-4 w-4 text-slate-500" />
              <span className="font-semibold text-white">
                {customer.quotesCount}
              </span>
              <span className="text-slate-500">Quotes</span>
            </p>
            <p className="inline-flex items-center gap-1.5">
              <IconProjects className="h-4 w-4 text-slate-500" />
              <span className="font-semibold text-white">
                {customer.projectsCount}
              </span>
              <span className="text-slate-500">Projects</span>
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
          href={`/dashboard/customers/${customer.id}`}
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [quotesSentTotal, setQuotesSentTotal] = useState(0);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(
    EMPTY_CUSTOMER_FORM
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const loadCustomers = useCallback(async () => {
    setError(null);

    const supabase = createClient();
    const [
      { data: customerData, error: fetchError },
      { data: quoteData },
      { data: projectData },
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("quotes").select("id, customer_id, status, sent_at"),
      supabase.from("projects").select("id, customer_id, status"),
    ]);

    if (fetchError) {
      setError("Failed to load customers. Please try again.");
      return;
    }

    const quotesByCustomer = new Map<string, number>();
    let sentCount = 0;
    for (const quote of (quoteData as
      | {
          id: string;
          customer_id: string | null;
          status: string | null;
          sent_at: string | null;
        }[]
      | null) ?? []) {
      const isSent =
        quote.status === "sent" ||
        quote.status === "accepted" ||
        quote.status === "declined" ||
        Boolean(quote.sent_at);
      if (isSent) sentCount += 1;
      if (!quote.customer_id) continue;
      quotesByCustomer.set(
        quote.customer_id,
        (quotesByCustomer.get(quote.customer_id) ?? 0) + 1
      );
    }

    const projectsByCustomer = new Map<
      string,
      { id: string; status: string }[]
    >();
    for (const project of (projectData as
      | { id: string; customer_id: string | null; status: string | null }[]
      | null) ?? []) {
      if (!project.customer_id) continue;
      const list = projectsByCustomer.get(project.customer_id) ?? [];
      list.push({ id: project.id, status: project.status ?? "active" });
      projectsByCustomer.set(project.customer_id, list);
    }

    const rows = ((customerData as Customer[] | null) ?? []).map(
      (customer) => {
        const customerProjects = projectsByCustomer.get(customer.id) ?? [];
        return {
          ...customer,
          quotesCount: quotesByCustomer.get(customer.id) ?? 0,
          projectsCount: customerProjects.length,
          isActive: deriveCustomerStatus(customerProjects) === "active",
        };
      }
    );

    setCustomers(rows);
    setQuotesSentTotal(sentCount);
    setProjectsTotal(
      ((projectData as { id: string }[] | null) ?? []).length
    );
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadCustomers();
      setIsLoading(false);
    }

    void init();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = [...customers];

    if (statusFilter === "active") {
      rows = rows.filter((row) => row.isActive);
    }

    if (query) {
      rows = rows.filter((row) => {
        const name = getCustomerDisplayName(row).toLowerCase();
        return (
          name.includes(query) ||
          (row.email ?? "").toLowerCase().includes(query) ||
          (row.phone ?? "").toLowerCase().includes(query)
        );
      });
    }

    rows.sort((a, b) => {
      if (sortBy === "name_asc") {
        return getCustomerDisplayName(a).localeCompare(
          getCustomerDisplayName(b)
        );
      }
      if (sortBy === "name_desc") {
        return getCustomerDisplayName(b).localeCompare(
          getCustomerDisplayName(a)
        );
      }
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });

    return rows;
  }, [customers, search, statusFilter, sortBy]);

  function openAddForm() {
    setEditingCustomer(null);
    setFormData(EMPTY_CUSTOMER_FORM);
    setShowForm(true);
    setSuccess(null);
    setError(null);
  }

  function openEditForm(customer: Customer) {
    setEditingCustomer(customer);
    setFormData(customerToForm(customer));
    setShowForm(true);
    setSuccess(null);
    setError(null);
  }

  function closeForm() {
    if (isSaving || isImporting) return;
    setShowForm(false);
    setEditingCustomer(null);
    setFormData(EMPTY_CUSTOMER_FORM);
  }

  async function handleImportContact() {
    setIsImporting(true);
    setError(null);

    try {
      const imported = await pickContactForForm();
      if (!imported) return;
      setFormData(imported);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to import contact. Please enter details manually."
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function handleSave(
    form: CustomerFormData,
    options?: { avatarFile?: File | null; removeAvatar?: boolean }
  ) {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to save customers.");
      setIsSaving(false);
      return;
    }

    const payload = formToPayload(form);

    if (editingCustomer) {
      let nextAvatarPath: string | null | undefined;
      const previousPath = editingCustomer.avatar_url ?? null;

      if (options?.removeAvatar) {
        nextAvatarPath = null;
      } else if (options?.avatarFile) {
        const uploadResult = await uploadCustomerAvatar({
          userId: user.id,
          customerId: editingCustomer.id,
          file: options.avatarFile,
        });
        if ("error" in uploadResult) {
          setError(uploadResult.error);
          setIsSaving(false);
          return;
        }
        nextAvatarPath = uploadResult.path;
      }

      const { error: updateError } = await supabase
        .from("customers")
        .update({
          ...payload,
          ...(nextAvatarPath !== undefined
            ? { avatar_url: nextAvatarPath }
            : {}),
        })
        .eq("id", editingCustomer.id)
        .eq("user_id", user.id);

      if (updateError) {
        if (nextAvatarPath) await deleteCustomerAvatarFile(nextAvatarPath);
        setError("Failed to update customer. Please try again.");
        setIsSaving(false);
        return;
      }

      if (
        (options?.removeAvatar || options?.avatarFile) &&
        previousPath &&
        previousPath !== nextAvatarPath
      ) {
        await deleteCustomerAvatarFile(previousPath);
      }

      setSuccess("Customer updated!");
    } else {
      const { error: insertError } = await supabase.from("customers").insert({
        ...payload,
        user_id: user.id,
      });

      if (insertError) {
        setError("Failed to add customer. Please try again.");
        setIsSaving(false);
        return;
      }

      setSuccess("Customer added!");
    }

    await loadCustomers();
    setIsSaving(false);
    setShowForm(false);
    setEditingCustomer(null);
    setFormData(EMPTY_CUSTOMER_FORM);
  }

  async function handleDelete(customer: Customer) {
    const confirmed = window.confirm(
      `Delete ${getCustomerDisplayName(customer)}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(customer.id);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id);

    if (deleteError) {
      setError("Failed to delete customer. Please try again.");
      setDeletingId(null);
      return;
    }

    setSuccess("Customer deleted.");
    await loadCustomers();
    setDeletingId(null);
  }

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 lg:p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
        <p className="mt-4 text-base text-slate-400">Loading customers...</p>
      </main>
    );
  }

  if (customers.length === 0) {
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

        <CustomersEmptyState onAddCustomer={openAddForm} />

        {showForm && (
          <CustomerFormModal
            title="Add Customer"
            initialForm={formData}
            isSaving={isSaving}
            isImporting={isImporting}
            onClose={closeForm}
            onSubmit={handleSave}
            onImportContact={handleImportContact}
            customerId={null}
          />
        )}
      </main>
    );
  }

  const activeCount = customers.filter((row) => row.isActive).length;

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Customers
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
              Manage your customer contacts for faster quoting and better
              service.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            className={`${touchBtnPrimary} w-full shrink-0 sm:w-auto`}
          >
            + Add Customer
          </button>
        </div>

        <StatsRow
          totalCustomers={customers.length}
          activeCustomers={activeCount}
          quotesSent={quotesSentTotal}
          projects={projectsTotal}
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search customers</span>
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customers by name, email or phone..."
              className={`${touchInput} w-full pl-10`}
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className={`${touchInput} w-full appearance-none sm:w-40`}
              aria-label="Filter by status"
            >
              <option value="all" className="bg-navy">
                All Status
              </option>
              <option value="active" className="bg-navy">
                Active
              </option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className={`${touchInput} w-full appearance-none sm:w-56`}
              aria-label="Sort customers"
            >
              <option value="recent" className="bg-navy">
                Sort by: Recently Added
              </option>
              <option value="name_asc" className="bg-navy">
                Sort by: Name A–Z
              </option>
              <option value="name_desc" className="bg-navy">
                Sort by: Name Z–A
              </option>
            </select>
            <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${
                  viewMode === "grid"
                    ? "bg-accent/20 text-accent"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
              >
                <IconGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition ${
                  viewMode === "list"
                    ? "bg-accent/20 text-accent"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
              >
                <IconList className="h-4 w-4" />
              </button>
            </div>
          </div>
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

        {filteredCustomers.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-500">
            No customers match your search or filters.
          </p>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid gap-4 sm:grid-cols-2"
                : "flex flex-col gap-3"
            }
          >
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                viewMode={viewMode}
                isDeleting={deletingId === customer.id}
                onEdit={() => openEditForm(customer)}
                onDelete={() => void handleDelete(customer)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <CustomerFormModal
          title={editingCustomer ? "Edit Customer" : "Add Customer"}
          initialForm={formData}
          isSaving={isSaving}
          isImporting={isImporting}
          onClose={closeForm}
          onSubmit={handleSave}
          onImportContact={handleImportContact}
          customerId={editingCustomer?.id ?? null}
          currentAvatarPath={editingCustomer?.avatar_url ?? null}
        />
      )}
    </main>
  );
}
