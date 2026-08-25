"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmployeesDashboardEmptyState } from "@/components/dashboard/employees-empty-state";
import { IconDocument, IconEmployee } from "@/components/dashboard/icons";
import {
  IconMail,
  IconMore,
  IconPhone,
  IconSearch,
} from "@/components/dashboard/workspace-icons";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import { EmployeeFormModal } from "@/components/settings/employee-form-modal";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { formatEmployeeMoney } from "@/lib/employee-details";
import { createClient } from "@/lib/supabase";
import {
  EMPTY_EMPLOYEE_FORM,
  employeeFormToPayload,
  employeeToForm,
  formatPayRate,
  type Employee,
  type EmployeeFormData,
} from "@/types/employee";

type EmployeeListItem = Employee & {
  totalLabourCost: number;
  totalPaid: number;
  outstandingBalance: number;
  invoiceCount: number;
};

type SortOption = "recent" | "name_asc" | "name_desc" | "outstanding";
type BalanceFilter = "all" | "outstanding";
type ViewMode = "grid" | "list";

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
  totalEmployees,
  withOutstanding,
  totalLabourCost,
  totalOutstanding,
}: {
  totalEmployees: number;
  withOutstanding: number;
  totalLabourCost: number;
  totalOutstanding: number;
}) {
  const cards = [
    {
      id: "total",
      label: "Total Employees",
      value: String(totalEmployees),
      icon: <IconEmployee className="h-5 w-5" />,
      iconClass: "bg-accent/15 text-accent ring-accent/30",
    },
    {
      id: "outstanding-count",
      label: "With Outstanding",
      value: String(withOutstanding),
      icon: <IconEmployee className="h-5 w-5" />,
      iconClass: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
    },
    {
      id: "labour",
      label: "Total Labour",
      value: formatEmployeeMoney(totalLabourCost),
      icon: <IconDocument className="h-5 w-5" />,
      iconClass: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
    },
    {
      id: "outstanding",
      label: "Outstanding",
      value: formatEmployeeMoney(totalOutstanding),
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

function EmployeeCard({
  employee,
  viewMode,
  isDeleting,
  onEdit,
  onDelete,
}: {
  employee: EmployeeListItem;
  viewMode: ViewMode;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasOutstanding = employee.outstandingBalance > 0.009;
  const detailHref = `/dashboard/employees/${employee.id}`;

  function openDetail() {
    router.push(detailHref);
  }

  return (
    <article
      className={`relative cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-accent/30 hover:bg-white/[0.05] ${
        viewMode === "list" ? "sm:flex sm:items-stretch sm:gap-6" : ""
      }`}
      onClick={openDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail();
        }
      }}
      role="link"
      tabIndex={0}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
        className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
        aria-label={`More actions for ${employee.full_name}`}
      >
        <IconMore className="h-4 w-4" />
      </button>
      {menuOpen ? (
        <div
          className="absolute right-3 top-12 z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <Link
            href={detailHref}
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
          <EntityAvatar name={employee.full_name} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-white">
                {employee.full_name}
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
            <p className="mt-1 truncate text-sm text-slate-400">
              {[employee.role, formatPayRate(employee.pay_rate, employee.pay_type)]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
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
              <span className="truncate">{employee.email || "—"}</span>
            </p>
            <p className="flex items-center gap-2 truncate">
              <IconPhone className="h-4 w-4 shrink-0 text-cyan-400/90" />
              <span className="truncate">{employee.phone || "—"}</span>
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-1 text-sm text-slate-300 sm:items-end">
            <p>
              <span className="text-slate-500">Total paid </span>
              <span className="font-semibold text-white">
                {formatEmployeeMoney(employee.totalPaid)}
              </span>
            </p>
            <p>
              <span className="text-slate-500">Outstanding </span>
              <span
                className={`font-semibold ${
                  hasOutstanding ? "text-amber-200" : "text-white"
                }`}
              >
                {formatEmployeeMoney(Math.max(0, employee.outstandingBalance))}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div
        className={`mt-5 flex flex-col gap-2 sm:flex-row ${
          viewMode === "list" ? "sm:mt-0 sm:shrink-0 sm:items-center" : ""
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <Link
          href={detailHref}
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_EMPLOYEE_FORM);
  const [search, setSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const loadEmployees = useCallback(async () => {
    setError(null);

    const supabase = createClient();
    const [
      { data: employeeData, error: fetchError },
      { data: invoiceData },
      { data: paymentData },
    ] = await Promise.all([
      supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("labour_invoices")
        .select("employee_id, amount, status"),
      supabase.from("labour_payments").select("employee_id, amount"),
    ]);

    if (fetchError) {
      const missingTable =
        fetchError.code === "42P01" ||
        fetchError.message?.includes("employees") ||
        fetchError.code === "PGRST205";
      setError(
        missingTable
          ? "Failed to load employees. Run migration 030_employees_and_project_assignments.sql in Supabase."
          : "Failed to load employees. Please try again."
      );
      return;
    }

    const labourByEmployee = new Map<string, number>();
    const invoicesByEmployee = new Map<string, number>();
    for (const invoice of (invoiceData as
      | { employee_id: string; amount: number; status: string }[]
      | null) ?? []) {
      // Match supplier list: only confirmed invoices roll into balances.
      if (invoice.status !== "confirmed") continue;
      labourByEmployee.set(
        invoice.employee_id,
        (labourByEmployee.get(invoice.employee_id) ?? 0) +
          (Number(invoice.amount) || 0)
      );
      invoicesByEmployee.set(
        invoice.employee_id,
        (invoicesByEmployee.get(invoice.employee_id) ?? 0) + 1
      );
    }

    const paidByEmployee = new Map<string, number>();
    for (const payment of (paymentData as
      | { employee_id: string; amount: number }[]
      | null) ?? []) {
      paidByEmployee.set(
        payment.employee_id,
        (paidByEmployee.get(payment.employee_id) ?? 0) +
          (Number(payment.amount) || 0)
      );
    }

    const rows = ((employeeData as Employee[] | null) ?? []).map((employee) => {
      const totalLabourCost = labourByEmployee.get(employee.id) ?? 0;
      const totalPaid = paidByEmployee.get(employee.id) ?? 0;
      return {
        ...employee,
        totalLabourCost,
        totalPaid,
        outstandingBalance: totalLabourCost - totalPaid,
        invoiceCount: invoicesByEmployee.get(employee.id) ?? 0,
      };
    });

    setEmployees(rows);
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadEmployees();
      setIsLoading(false);
    }
    void init();
  }, [loadEmployees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = [...employees];

    if (balanceFilter === "outstanding") {
      rows = rows.filter((row) => row.outstandingBalance > 0.009);
    }

    if (query) {
      rows = rows.filter((row) => {
        return (
          row.full_name.toLowerCase().includes(query) ||
          (row.role ?? "").toLowerCase().includes(query) ||
          (row.email ?? "").toLowerCase().includes(query) ||
          (row.phone ?? "").toLowerCase().includes(query)
        );
      });
    }

    rows.sort((a, b) => {
      if (sortBy === "name_desc") {
        return b.full_name.localeCompare(a.full_name);
      }
      if (sortBy === "outstanding") {
        return b.outstandingBalance - a.outstandingBalance;
      }
      if (sortBy === "recent") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return a.full_name.localeCompare(b.full_name);
    });

    return rows;
  }, [employees, search, balanceFilter, sortBy]);

  function openAddForm() {
    setEditingEmployee(null);
    setFormData(EMPTY_EMPLOYEE_FORM);
    setShowForm(true);
    setSuccess(null);
    setError(null);
  }

  function openEditForm(employee: Employee) {
    setEditingEmployee(employee);
    setFormData(employeeToForm(employee));
    setShowForm(true);
    setSuccess(null);
    setError(null);
  }

  function closeForm() {
    if (isSaving) return;
    setShowForm(false);
    setEditingEmployee(null);
    setFormData(EMPTY_EMPLOYEE_FORM);
  }

  async function handleSave(form: EmployeeFormData) {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSaving(false);
      throw new Error("You must be logged in to save employees.");
    }

    const payload = employeeFormToPayload(form);

    if (editingEmployee) {
      const { error: updateError } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", editingEmployee.id)
        .eq("user_id", user.id);

      if (updateError) {
        setIsSaving(false);
        throw new Error(
          updateError.message?.includes("employees")
            ? "Failed to update employee. Run migration 030 in Supabase."
            : "Failed to update employee. Please try again."
        );
      }
      setSuccess("Employee updated!");
    } else {
      const { error: insertError } = await supabase.from("employees").insert({
        ...payload,
        user_id: user.id,
      });

      if (insertError) {
        setIsSaving(false);
        throw new Error(
          insertError.message?.includes("employees")
            ? "Failed to add employee. Run migration 030 in Supabase."
            : "Failed to add employee. Please try again."
        );
      }
      setSuccess("Employee added!");
    }

    await loadEmployees();
    setIsSaving(false);
    setShowForm(false);
    setEditingEmployee(null);
    setFormData(EMPTY_EMPLOYEE_FORM);
  }

  async function handleDelete(employee: Employee) {
    const confirmed = window.confirm(
      `Delete ${employee.full_name}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(employee.id);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("employees")
      .delete()
      .eq("id", employee.id);

    if (deleteError) {
      setError("Failed to delete employee. Please try again.");
      setDeletingId(null);
      return;
    }

    setSuccess("Employee deleted.");
    await loadEmployees();
    setDeletingId(null);
  }

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 lg:p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
        <p className="mt-4 text-base text-slate-400">Loading employees...</p>
      </main>
    );
  }

  if (employees.length === 0) {
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

        <EmployeesDashboardEmptyState onAddEmployee={openAddForm} />

        {showForm && (
          <EmployeeFormModal
            title="Add Employee"
            initialForm={formData}
            isSaving={isSaving}
            onClose={closeForm}
            onSubmit={handleSave}
          />
        )}
      </main>
    );
  }

  const withOutstanding = employees.filter(
    (row) => row.outstandingBalance > 0.009
  ).length;
  const totalLabourCost = employees.reduce(
    (sum, row) => sum + row.totalLabourCost,
    0
  );
  const totalOutstanding = employees.reduce(
    (sum, row) => sum + Math.max(0, row.outstandingBalance),
    0
  );

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Employees
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
              Track labour invoices, payments, and who you still owe.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            className={`${touchBtnPrimary} w-full sm:w-auto`}
          >
            + Add Employee
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
          totalEmployees={employees.length}
          withOutstanding={withOutstanding}
          totalLabourCost={totalLabourCost}
          totalOutstanding={totalOutstanding}
        />

        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, role, email, phone…"
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
              <option value="all">All employees</option>
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

        {filteredEmployees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
            <p className="text-sm text-slate-400">
              No employees match your search or filters.
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
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                viewMode={viewMode}
                isDeleting={deletingId === employee.id}
                onEdit={() => openEditForm(employee)}
                onDelete={() => void handleDelete(employee)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <EmployeeFormModal
          title={editingEmployee ? "Edit Employee" : "Add Employee"}
          initialForm={formData}
          isSaving={isSaving}
          onClose={closeForm}
          onSubmit={handleSave}
        />
      )}
    </main>
  );
}
