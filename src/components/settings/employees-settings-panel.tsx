"use client";

/**
 * Advance Setting > Employees panel.
 *
 * Designed to grow: this section will later host additional employee-related
 * options (permissions, roles, payroll settings, etc.). Keep new options as
 * sibling cards/panels under this file or in `src/components/settings/employees/`.
 */

import { useCallback, useEffect, useState } from "react";
import { EmployeeFormModal } from "@/components/settings/employee-form-modal";
import { EmployeesEmptyState } from "@/components/settings/employees-empty-state";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import { createClient } from "@/lib/supabase";
import {
  EMPTY_EMPLOYEE_FORM,
  employeeFormToPayload,
  employeeToForm,
  formatEmployeeAddress,
  formatPayRate,
  type Employee,
  type EmployeeFormData,
} from "@/types/employee";
import { formatProjectDate } from "@/types/project";

function EmployeeCard({
  employee,
  isDeleting,
  onEdit,
  onDelete,
}: {
  employee: Employee;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const address = formatEmployeeAddress(employee);
  const details = [
    { label: "Email", value: employee.email },
    { label: "Phone", value: employee.phone },
    { label: "Role", value: employee.role },
    {
      label: "Hired",
      value: employee.hire_date
        ? formatProjectDate(employee.hire_date)
        : null,
    },
    {
      label: "Pay",
      value: formatPayRate(employee.pay_rate, employee.pay_type),
    },
    { label: "Address", value: address || null },
  ].filter((item) => item.value && item.value !== "—");

  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-lg font-semibold text-white">{employee.full_name}</h3>
      {employee.role ? (
        <p className="mt-1 text-sm text-slate-400">{employee.role}</p>
      ) : null}

      {details.length > 0 ? (
        <dl className="mt-4 space-y-2">
          {details.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"
            >
              <dt className="shrink-0 text-sm font-medium text-slate-500 sm:w-24">
                {item.label}
              </dt>
              <dd className="text-sm text-slate-300">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No contact details added.</p>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onEdit}
          className={`${touchBtnSecondary} w-full sm:w-auto`}
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

export function EmployeesSettingsPanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const loadEmployees = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("employees")
      .select("*")
      .order("full_name", { ascending: true });

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

    setEmployees((data as Employee[]) ?? []);
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadEmployees();
      setIsLoading(false);
    }
    void init();
  }, [loadEmployees]);

  function openAddForm() {
    setEditingEmployee(null);
    setShowForm(true);
    setSuccess(null);
    setError(null);
  }

  function openEditForm(employee: Employee) {
    setEditingEmployee(employee);
    setShowForm(true);
    setSuccess(null);
    setError(null);
  }

  function closeForm() {
    if (isSaving) return;
    setShowForm(false);
    setEditingEmployee(null);
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
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
        <p className="mt-4 text-base text-slate-400">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Future expansion: permissions, roles, payroll settings panels go here. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Employees</h2>
          <p className="mt-1 text-sm text-slate-400">
            Register crew members, then assign them on Project Detail so they
            get notified when a project starts.
          </p>
        </div>
        {employees.length > 0 ? (
          <button
            type="button"
            onClick={openAddForm}
            className={`${touchBtnPrimary} w-full shrink-0 sm:w-auto`}
          >
            + Add Employee
          </button>
        ) : null}
      </div>

      {success ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-base text-green-400">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
          {error}
        </div>
      ) : null}

      {employees.length === 0 ? (
        <EmployeesEmptyState onAddEmployee={openAddForm} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              isDeleting={deletingId === employee.id}
              onEdit={() => openEditForm(employee)}
              onDelete={() => void handleDelete(employee)}
            />
          ))}
        </div>
      )}

      {showForm ? (
        <EmployeeFormModal
          title={editingEmployee ? "Edit Employee" : "Add Employee"}
          initialForm={
            editingEmployee
              ? employeeToForm(editingEmployee)
              : EMPTY_EMPLOYEE_FORM
          }
          isSaving={isSaving}
          onClose={closeForm}
          onSubmit={handleSave}
        />
      ) : null}
    </div>
  );
}
