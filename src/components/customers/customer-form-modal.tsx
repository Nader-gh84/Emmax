"use client";

import { useEffect, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import { isContactPickerSupported } from "@/lib/customer-contacts";
import type { CustomerFormData } from "@/types/customer";

export function CustomerFormModal({
  title,
  initialForm,
  isSaving,
  isImporting,
  onClose,
  onSubmit,
  onImportContact,
}: {
  title: string;
  initialForm: CustomerFormData;
  isSaving: boolean;
  isImporting: boolean;
  onClose: () => void;
  onSubmit: (form: CustomerFormData) => Promise<void>;
  onImportContact: () => Promise<void>;
}) {
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
        onClick={() => {
          if (!isSaving && !isImporting) onClose();
        }}
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
