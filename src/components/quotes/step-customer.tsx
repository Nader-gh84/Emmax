"use client";

import { touchBtnPrimary, touchBtnSecondary, touchInput, touchTextarea } from "@/components/quotes/ui";

interface StepCustomerProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  notes: string;
  validityDays: number;
  onChange: (field: string, value: string | number) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function StepCustomer({
  customerName,
  customerEmail,
  customerPhone,
  projectName,
  notes,
  validityDays,
  onChange,
  onBack,
  onContinue,
}: StepCustomerProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) return;
    onContinue();
  }

  return (
    <div className="min-w-0">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">
        Customer details
      </h2>
      <p className="mt-2 text-base text-slate-400">Who is this quote for?</p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-3xl">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Customer name" required className="md:col-span-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => onChange("customerName", e.target.value)}
              required
              className={touchInput}
              placeholder="John Smith"
            />
          </Field>

          <Field label="Customer email" required>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => onChange("customerEmail", e.target.value)}
              required
              className={touchInput}
              placeholder="john@example.com"
            />
          </Field>

          <Field label="Customer phone">
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => onChange("customerPhone", e.target.value)}
              className={touchInput}
              placeholder="(416) 555-0123"
            />
          </Field>

          <Field label="Project name" className="md:col-span-2">
            <input
              type="text"
              value={projectName}
              onChange={(e) => onChange("projectName", e.target.value)}
              className={touchInput}
              placeholder="Kitchen panel upgrade"
            />
          </Field>

          <Field label="Notes / scope of work" className="md:col-span-2">
            <textarea
              value={notes}
              onChange={(e) => onChange("notes", e.target.value)}
              rows={4}
              className={touchTextarea}
            />
          </Field>

          <Field label="Quote validity (days)">
            <input
              type="number"
              min="1"
              value={validityDays}
              onChange={(e) =>
                onChange("validityDays", parseInt(e.target.value) || 30)
              }
              className={touchInput}
            />
          </Field>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={onBack} className={`${touchBtnSecondary} w-full sm:w-auto`}>
            Back
          </button>
          <button type="submit" className={`${touchBtnPrimary} w-full sm:w-auto`}>
            Generate Quote
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-base font-medium text-slate-300">
        {label}
        {required && <span className="text-accent"> *</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
