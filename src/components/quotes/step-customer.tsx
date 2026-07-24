"use client";

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
    <div>
      <h2 className="text-xl font-semibold text-white">Customer details</h2>
      <p className="mt-2 text-sm text-slate-400">
        Who is this quote for?
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-5">
        <Field label="Customer name" required>
          <input
            type="text"
            value={customerName}
            onChange={(e) => onChange("customerName", e.target.value)}
            required
            className={inputClass}
            placeholder="John Smith"
          />
        </Field>

        <Field label="Customer email" required>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => onChange("customerEmail", e.target.value)}
            required
            className={inputClass}
            placeholder="john@example.com"
          />
        </Field>

        <Field label="Customer phone">
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => onChange("customerPhone", e.target.value)}
            className={inputClass}
            placeholder="(416) 555-0123"
          />
        </Field>

        <Field label="Project name">
          <input
            type="text"
            value={projectName}
            onChange={(e) => onChange("projectName", e.target.value)}
            className={inputClass}
            placeholder="Kitchen panel upgrade"
          />
        </Field>

        <Field label="Notes / scope of work">
          <textarea
            value={notes}
            onChange={(e) => onChange("notes", e.target.value)}
            rows={4}
            className={inputClass}
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
            className={inputClass}
          />
        </Field>

        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-white/20 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
          >
            Back
          </button>
          <button
            type="submit"
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            Generate Quote
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-accent"> *</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
