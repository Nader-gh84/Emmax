"use client";

import { useCallback, useEffect, useState } from "react";
import { CustomersEmptyState } from "@/components/dashboard/customers-empty-state";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import {
  isContactPickerSupported,
  pickContactForForm,
} from "@/lib/customer-contacts";
import { createClient } from "@/lib/supabase";
import {
  EMPTY_CUSTOMER_FORM,
  getCustomerDisplayName,
  type Customer,
  type CustomerFormData,
} from "@/types/customer";

function customerToForm(customer: Customer): CustomerFormData {
  return {
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    notes: customer.notes ?? "",
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
  };
}

interface CustomerFormModalProps {
  title: string;
  initialForm: CustomerFormData;
  isSaving: boolean;
  isImporting: boolean;
  onClose: () => void;
  onSubmit: (form: CustomerFormData) => Promise<void>;
  onImportContact: () => Promise<void>;
}

function CustomerFormModal({
  title,
  initialForm,
  isSaving,
  isImporting,
  onClose,
  onSubmit,
  onImportContact,
}: CustomerFormModalProps) {
  const [form, setForm] = useState<CustomerFormData>(initialForm);
  const [contactPickerSupported, setContactPickerSupported] = useState(false);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  useEffect(() => {
    setContactPickerSupported(isContactPickerSupported());
  }, []);

  function updateField(key: keyof CustomerFormData, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) return;
    await onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">{title}</h2>

        <div className="mt-6 space-y-4">
          {contactPickerSupported ? (
            <button
              type="button"
              onClick={onImportContact}
              disabled={isSaving || isImporting}
              className={`${touchBtnSecondary} w-full`}
            >
              {isImporting ? "Opening contacts..." : "Import from Contacts"}
            </button>
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
              Contact import isn&apos;t supported on this device — please
              enter details manually below.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="customer-first-name"
                className="block text-base font-medium text-slate-300"
              >
                First Name <span className="text-accent">*</span>
              </label>
              <input
                id="customer-first-name"
                type="text"
                value={form.first_name}
                onChange={(event) =>
                  updateField("first_name", event.target.value)
                }
                className={`${touchInput} mt-1.5`}
                placeholder="First name"
                required
                autoComplete="given-name"
              />
            </div>

            <div>
              <label
                htmlFor="customer-last-name"
                className="block text-base font-medium text-slate-300"
              >
                Last Name <span className="text-accent">*</span>
              </label>
              <input
                id="customer-last-name"
                type="text"
                value={form.last_name}
                onChange={(event) =>
                  updateField("last_name", event.target.value)
                }
                className={`${touchInput} mt-1.5`}
                placeholder="Last name"
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="customer-email"
              className="block text-base font-medium text-slate-300"
            >
              Email
            </label>
            <input
              id="customer-email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="customer-phone"
              className="block text-base font-medium text-slate-300"
            >
              Phone
            </label>
            <input
              id="customer-phone"
              type="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
              autoComplete="tel"
            />
          </div>

          <div>
            <label
              htmlFor="customer-address"
              className="block text-base font-medium text-slate-300"
            >
              Address
            </label>
            <input
              id="customer-address"
              type="text"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
              autoComplete="street-address"
            />
          </div>

          <div>
            <label
              htmlFor="customer-notes"
              className="block text-base font-medium text-slate-300"
            >
              Notes
            </label>
            <textarea
              id="customer-notes"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className={`${touchTextarea} mt-1.5 min-h-[96px]`}
              placeholder="Optional"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`${touchBtnSecondary} w-full sm:w-auto`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSaving || !form.first_name.trim() || !form.last_name.trim()
              }
              className={`${touchBtnPrimary} w-full sm:w-auto`}
            >
              {isSaving ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerCard({
  customer,
  isDeleting,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayName = getCustomerDisplayName(customer);

  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-lg font-semibold text-white">{displayName}</h3>

      <dl className="mt-4 space-y-2">
        {customer.email && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-sm font-medium text-slate-500 sm:w-16">
              Email
            </dt>
            <dd className="text-sm text-slate-300">{customer.email}</dd>
          </div>
        )}
        {customer.phone && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-sm font-medium text-slate-500 sm:w-16">
              Phone
            </dt>
            <dd className="text-sm text-slate-300">{customer.phone}</dd>
          </div>
        )}
        {customer.address && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-sm font-medium text-slate-500 sm:w-16">
              Address
            </dt>
            <dd className="text-sm text-slate-300">{customer.address}</dd>
          </div>
        )}
        {!customer.email && !customer.phone && !customer.address && (
          <p className="text-sm text-slate-500">No contact details added.</p>
        )}
      </dl>

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  const loadCustomers = useCallback(async () => {
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (fetchError) {
      setError("Failed to load customers. Please try again.");
      return;
    }

    setCustomers((data as Customer[]) ?? []);
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadCustomers();
      setIsLoading(false);
    }

    init();
  }, [loadCustomers]);

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

      if (!imported) {
        return;
      }

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

  async function handleSave(form: CustomerFormData) {
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
      const { error: updateError } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", editingCustomer.id)
        .eq("user_id", user.id);

      if (updateError) {
        setError("Failed to update customer. Please try again.");
        setIsSaving(false);
        return;
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

  // Step 1: empty state only — no stats row / table when there are zero customers.
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
          />
        )}
      </main>
    );
  }

  // Temporary list until Step 2 (table redesign).
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Customers</h1>
            <p className="mt-2 text-base text-slate-400">
              Manage your customer contacts for faster quoting.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            className={`${touchBtnPrimary} w-full sm:w-auto`}
          >
            + Add Customer
          </button>
        </div>

        {success && (
          <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-base text-green-400">
            {success}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              isDeleting={deletingId === customer.id}
              onEdit={() => openEditForm(customer)}
              onDelete={() => handleDelete(customer)}
            />
          ))}
        </div>
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
        />
      )}
    </main>
  );
}
