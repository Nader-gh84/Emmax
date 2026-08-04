"use client";

import { useEffect, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import {
  EMPLOYEE_PAY_TYPES,
  type EmployeeFormData,
  type EmployeePayType,
} from "@/types/employee";

export function EmployeeFormModal({
  title,
  initialForm,
  isSaving,
  onClose,
  onSubmit,
}: {
  title: string;
  initialForm: EmployeeFormData;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (form: EmployeeFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<EmployeeFormData>(initialForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialForm);
    setError(null);
  }, [initialForm]);

  function updateField(key: keyof EmployeeFormData, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function setPayType(payType: EmployeePayType) {
    setForm((current) => ({ ...current, pay_type: payType }));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (form.pay_rate.trim()) {
      const rate = Number.parseFloat(form.pay_rate);
      if (Number.isNaN(rate) || rate < 0) {
        setError("Pay rate must be a valid non-negative number.");
        return;
      }
    }

    try {
      await onSubmit(form);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save employee."
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!isSaving) onClose();
        }}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">
          Crew member details used for assignments and project start notices.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="employee-full-name"
              className="block text-base font-medium text-slate-300"
            >
              Full Name <span className="text-accent">*</span>
            </label>
            <input
              id="employee-full-name"
              type="text"
              value={form.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Full name"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label
              htmlFor="employee-email"
              className="block text-base font-medium text-slate-300"
            >
              Email
            </label>
            <input
              id="employee-email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional — needed for project start emails"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="employee-phone"
              className="block text-base font-medium text-slate-300"
            >
              Phone
            </label>
            <input
              id="employee-phone"
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
              htmlFor="employee-role"
              className="block text-base font-medium text-slate-300"
            >
              Role / Position
            </label>
            <input
              id="employee-role"
              type="text"
              value={form.role}
              onChange={(event) => updateField("role", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="e.g. Electrician, Apprentice"
            />
          </div>

          <div>
            <label
              htmlFor="employee-hire-date"
              className="block text-base font-medium text-slate-300"
            >
              Hire Date
            </label>
            <input
              id="employee-hire-date"
              type="date"
              value={form.hire_date}
              onChange={(event) => updateField("hire_date", event.target.value)}
              className={`${touchInput} mt-1.5`}
            />
          </div>

          <div>
            <span className="block text-base font-medium text-slate-300">
              Pay type
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {EMPLOYEE_PAY_TYPES.map((option) => {
                const active = form.pay_type === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPayType(option.id)}
                    className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold transition ${
                      active
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="employee-pay-rate"
              className="block text-base font-medium text-slate-300"
            >
              Pay Rate
            </label>
            <input
              id="employee-pay-rate"
              type="number"
              min="0"
              step="0.01"
              value={form.pay_rate}
              onChange={(event) => updateField("pay_rate", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder={
                form.pay_type === "salary"
                  ? "Fixed amount (optional)"
                  : "Hourly rate (optional)"
              }
            />
          </div>

          <fieldset className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <legend className="px-1 text-base font-medium text-slate-300">
              Address
            </legend>
            <div>
              <label
                htmlFor="employee-street"
                className="block text-sm font-medium text-slate-400"
              >
                Street
              </label>
              <input
                id="employee-street"
                type="text"
                value={form.address_street}
                onChange={(event) =>
                  updateField("address_street", event.target.value)
                }
                className={`${touchInput} mt-1.5`}
                placeholder="Street address"
                autoComplete="street-address"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="employee-city"
                  className="block text-sm font-medium text-slate-400"
                >
                  City
                </label>
                <input
                  id="employee-city"
                  type="text"
                  value={form.address_city}
                  onChange={(event) =>
                    updateField("address_city", event.target.value)
                  }
                  className={`${touchInput} mt-1.5`}
                  placeholder="City"
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <label
                  htmlFor="employee-province"
                  className="block text-sm font-medium text-slate-400"
                >
                  Province
                </label>
                <input
                  id="employee-province"
                  type="text"
                  value={form.address_province}
                  onChange={(event) =>
                    updateField("address_province", event.target.value)
                  }
                  className={`${touchInput} mt-1.5`}
                  placeholder="Province"
                  autoComplete="address-level1"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="employee-postal"
                className="block text-sm font-medium text-slate-400"
              >
                Postal code
              </label>
              <input
                id="employee-postal"
                type="text"
                value={form.address_postal}
                onChange={(event) =>
                  updateField("address_postal", event.target.value)
                }
                className={`${touchInput} mt-1.5`}
                placeholder="Postal code"
                autoComplete="postal-code"
              />
            </div>
          </fieldset>

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
              disabled={isSaving || !form.full_name.trim()}
              className={`${touchBtnPrimary} w-full sm:w-auto`}
            >
              {isSaving ? "Saving..." : "Save Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
