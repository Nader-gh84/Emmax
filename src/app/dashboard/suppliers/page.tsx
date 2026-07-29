"use client";

import { useCallback, useEffect, useState } from "react";
import { SuppliersEmptyState } from "@/components/dashboard/suppliers-empty-state";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import { createClient } from "@/lib/supabase";
import {
  EMPTY_SUPPLIER_FORM,
  ORDER_METHODS,
  type Supplier,
  type SupplierFormData,
} from "@/types/supplier";

function supplierToForm(supplier: Supplier): SupplierFormData {
  return {
    supplier_name: supplier.supplier_name,
    contact_person: supplier.contact_person ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    location: supplier.location ?? "",
    preferred_order_method: supplier.preferred_order_method ?? "",
  };
}

function formToPayload(form: SupplierFormData) {
  return {
    supplier_name: form.supplier_name.trim(),
    contact_person: form.contact_person.trim() || null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    location: form.location.trim() || null,
    preferred_order_method: form.preferred_order_method.trim() || null,
  };
}

interface SupplierFormModalProps {
  title: string;
  initialForm: SupplierFormData;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (form: SupplierFormData) => Promise<void>;
}

function SupplierFormModal({
  title,
  initialForm,
  isSaving,
  onClose,
  onSubmit,
}: SupplierFormModalProps) {
  const [form, setForm] = useState<SupplierFormData>(initialForm);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  function updateField(key: keyof SupplierFormData, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.supplier_name.trim()) return;
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="supplier-name"
              className="block text-base font-medium text-slate-300"
            >
              Supplier Name <span className="text-accent">*</span>
            </label>
            <input
              id="supplier-name"
              type="text"
              value={form.supplier_name}
              onChange={(event) =>
                updateField("supplier_name", event.target.value)
              }
              className={`${touchInput} mt-1.5`}
              placeholder="e.g. ABC Electrical Supply"
              required
            />
          </div>

          <div>
            <label
              htmlFor="supplier-contact"
              className="block text-base font-medium text-slate-300"
            >
              Contact Person
            </label>
            <input
              id="supplier-contact"
              type="text"
              value={form.contact_person}
              onChange={(event) =>
                updateField("contact_person", event.target.value)
              }
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
            />
          </div>

          <div>
            <label
              htmlFor="supplier-email"
              className="block text-base font-medium text-slate-300"
            >
              Email
            </label>
            <input
              id="supplier-email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
            />
          </div>

          <div>
            <label
              htmlFor="supplier-phone"
              className="block text-base font-medium text-slate-300"
            >
              Phone
            </label>
            <input
              id="supplier-phone"
              type="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
            />
          </div>

          <div>
            <label
              htmlFor="supplier-location"
              className="block text-base font-medium text-slate-300"
            >
              Location / Branch
            </label>
            <input
              id="supplier-location"
              type="text"
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
            />
          </div>

          <div>
            <label
              htmlFor="supplier-order-method"
              className="block text-base font-medium text-slate-300"
            >
              Preferred Order Method
            </label>
            <select
              id="supplier-order-method"
              value={form.preferred_order_method}
              onChange={(event) =>
                updateField("preferred_order_method", event.target.value)
              }
              className={`${touchInput} mt-1.5 appearance-none`}
            >
              <option value="">Select method (optional)</option>
              {ORDER_METHODS.map((method) => (
                <option key={method} value={method} className="bg-navy text-white">
                  {method}
                </option>
              ))}
            </select>
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
              disabled={isSaving || !form.supplier_name.trim()}
              className={`${touchBtnPrimary} w-full sm:w-auto`}
            >
              {isSaving ? "Saving..." : "Save Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SupplierCard({
  supplier,
  isDeleting,
  onEdit,
  onDelete,
}: {
  supplier: Supplier;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const details = [
    { label: "Contact", value: supplier.contact_person },
    { label: "Email", value: supplier.email },
    { label: "Phone", value: supplier.phone },
    { label: "Location", value: supplier.location },
    { label: "Order via", value: supplier.preferred_order_method },
  ].filter((item) => item.value);

  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-lg font-semibold text-white">
        {supplier.supplier_name}
      </h3>

      {details.length > 0 ? (
        <dl className="mt-4 space-y-2">
          {details.map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const loadSuppliers = useCallback(async () => {
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("suppliers")
      .select("*")
      .order("supplier_name", { ascending: true });

    if (fetchError) {
      setError("Failed to load suppliers. Please try again.");
      return;
    }

    setSuppliers((data as Supplier[]) ?? []);
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadSuppliers();
      setIsLoading(false);
    }

    init();
  }, [loadSuppliers]);

  function openAddForm() {
    setEditingSupplier(null);
    setShowForm(true);
    setSuccess(null);
    setError(null);
  }

  function openEditForm(supplier: Supplier) {
    setEditingSupplier(supplier);
    setShowForm(true);
    setSuccess(null);
    setError(null);
  }

  function closeForm() {
    if (isSaving) return;
    setShowForm(false);
    setEditingSupplier(null);
  }

  async function handleSave(form: SupplierFormData) {
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
      const { error: updateError } = await supabase
        .from("suppliers")
        .update(payload)
        .eq("id", editingSupplier.id)
        .eq("user_id", user.id);

      if (updateError) {
        setError("Failed to update supplier. Please try again.");
        setIsSaving(false);
        return;
      }

      setSuccess("Supplier updated!");
    } else {
      const { error: insertError } = await supabase.from("suppliers").insert({
        ...payload,
        user_id: user.id,
      });

      if (insertError) {
        setError("Failed to add supplier. Please try again.");
        setIsSaving(false);
        return;
      }

      setSuccess("Supplier added!");
    }

    await loadSuppliers();
    setIsSaving(false);
    setShowForm(false);
    setEditingSupplier(null);
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

  // Step 1: empty state only — no stats row / table when there are zero suppliers.
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
            initialForm={EMPTY_SUPPLIER_FORM}
            isSaving={isSaving}
            onClose={closeForm}
            onSubmit={handleSave}
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
            <h1 className="text-2xl font-bold text-white">Suppliers</h1>
            <p className="mt-2 text-base text-slate-400">
              Manage your material and parts suppliers for faster ordering.
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
          <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-base text-green-400">
            {success}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
            {error}
          </div>
        )}

        {suppliers.length < 3 && (
          <p className="mt-6 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-slate-300">
            Add at least 3 suppliers to get the most out of ordering.
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {suppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              isDeleting={deletingId === supplier.id}
              onEdit={() => openEditForm(supplier)}
              onDelete={() => handleDelete(supplier)}
            />
          ))}
        </div>
      </div>

      {showForm && (
        <SupplierFormModal
          title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
          initialForm={
            editingSupplier
              ? supplierToForm(editingSupplier)
              : EMPTY_SUPPLIER_FORM
          }
          isSaving={isSaving}
          onClose={closeForm}
          onSubmit={handleSave}
        />
      )}
    </main>
  );
}
