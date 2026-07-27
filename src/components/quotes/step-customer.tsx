"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/profile/searchable-select";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import type { CustomerSelectionMode } from "@/lib/quotes";
import { createClient } from "@/lib/supabase";
import { getCustomerDisplayName, type Customer } from "@/types/customer";

interface StepCustomerProps {
  customerMode: CustomerSelectionMode;
  selectedCustomerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  notes: string;
  validityDays: number;
  onModeChange: (mode: CustomerSelectionMode) => void;
  onSelectCustomer: (customerId: string | null) => void;
  onChange: (field: string, value: string | number) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function StepCustomer({
  customerMode,
  selectedCustomerId,
  customerName,
  customerEmail,
  customerPhone,
  projectName,
  notes,
  validityDays,
  onModeChange,
  onSelectCustomer,
  onChange,
  onBack,
  onContinue,
}: StepCustomerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  useEffect(() => {
    async function loadCustomers() {
      setIsLoadingCustomers(true);

      const supabase = createClient();
      const { data } = await supabase
        .from("customers")
        .select("*")
        .order("last_quoted_at", { ascending: false, nullsFirst: false })
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      setCustomers((data as Customer[]) ?? []);
      setIsLoadingCustomers(false);
    }

    loadCustomers();
  }, []);

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: getCustomerDisplayName(customer),
        hint: [customer.email, customer.phone].filter(Boolean).join(" · "),
      })),
    [customers]
  );

  const duplicateCustomer = useMemo(() => {
    const normalizedEmail = customerEmail.trim().toLowerCase();
    if (!normalizedEmail || customerMode !== "new") return null;

    return (
      customers.find(
        (customer) =>
          customer.email?.trim().toLowerCase() === normalizedEmail
      ) ?? null
    );
  }, [customerEmail, customerMode, customers]);

  function handleSelectExistingCustomer(customerId: string) {
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) return;

    onSelectCustomer(customerId);
    onChange("customerName", getCustomerDisplayName(customer));
    onChange("customerEmail", customer.email ?? "");
    onChange("customerPhone", customer.phone ?? "");
  }

  function handleUseExistingCustomer() {
    if (!duplicateCustomer) return;

    onModeChange("existing");
    handleSelectExistingCustomer(duplicateCustomer.id);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onContinue();
  }

  return (
    <div className="min-w-0">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">
        Customer details
      </h2>
      <p className="mt-2 text-base text-slate-400">
        Select a saved customer or enter someone new. Customer info is only
        required when sending the quote.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-3xl">
        <button
          type="button"
          onClick={() => onModeChange("existing")}
          className={`rounded-xl border px-4 py-4 text-left transition ${
            customerMode === "existing"
              ? "border-accent bg-accent/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/20"
          }`}
        >
          <p className="text-base font-semibold text-white">
            Select existing customer
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Choose from your saved contacts
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            onModeChange("new");
            onSelectCustomer(null);
          }}
          className={`rounded-xl border px-4 py-4 text-left transition ${
            customerMode === "new"
              ? "border-accent bg-accent/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/20"
          }`}
        >
          <p className="text-base font-semibold text-white">
            Enter a new customer
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Type details manually for this quote
          </p>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 max-w-3xl">
        {customerMode === "existing" ? (
          <div className="space-y-5">
            <Field label="Saved customer">
              {isLoadingCustomers ? (
                <p className="text-sm text-slate-400">Loading customers...</p>
              ) : customers.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                  No saved customers yet. Switch to &quot;Enter a new
                  customer&quot; or add customers from the Customers page.
                </div>
              ) : (
                <SearchableSelect
                  id="quote-customer-select"
                  options={customerOptions}
                  value={selectedCustomerId ?? ""}
                  onChange={handleSelectExistingCustomer}
                  placeholder="Search customers..."
                  emptyQueryMaxResults={customers.length}
                />
              )}
            </Field>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Customer name" className="md:col-span-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) =>
                    onChange("customerName", event.target.value)
                  }
                  className={touchInput}
                  placeholder="John Smith"
                />
              </Field>

              <Field label="Customer email">
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(event) =>
                    onChange("customerEmail", event.target.value)
                  }
                  className={touchInput}
                  placeholder="john@example.com"
                />
              </Field>

              <Field label="Customer phone">
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(event) =>
                    onChange("customerPhone", event.target.value)
                  }
                  className={touchInput}
                  placeholder="(416) 555-0123"
                />
              </Field>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Customer name" className="md:col-span-2">
              <input
                type="text"
                value={customerName}
                onChange={(event) =>
                  onChange("customerName", event.target.value)
                }
                className={touchInput}
                placeholder="John Smith"
              />
            </Field>

            <Field label="Customer email">
              <input
                type="email"
                value={customerEmail}
                onChange={(event) =>
                  onChange("customerEmail", event.target.value)
                }
                className={touchInput}
                placeholder="john@example.com"
              />
            </Field>

            <Field label="Customer phone">
              <input
                type="tel"
                value={customerPhone}
                onChange={(event) =>
                  onChange("customerPhone", event.target.value)
                }
                className={touchInput}
                placeholder="(416) 555-0123"
              />
            </Field>

            {duplicateCustomer && (
              <div className="md:col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                A customer with this email already exists —{" "}
                <button
                  type="button"
                  onClick={handleUseExistingCustomer}
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  Use existing customer
                </button>{" "}
                instead?
              </div>
            )}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Project name" className="md:col-span-2">
            <input
              type="text"
              value={projectName}
              onChange={(event) => onChange("projectName", event.target.value)}
              className={touchInput}
              placeholder="Kitchen panel upgrade"
            />
          </Field>

          <Field label="Notes / scope of work" className="md:col-span-2">
            <textarea
              value={notes}
              onChange={(event) => onChange("notes", event.target.value)}
              rows={4}
              className={touchTextarea}
            />
          </Field>

          <Field label="Quote validity (days)">
            <input
              type="number"
              min="1"
              value={validityDays}
              onChange={(event) =>
                onChange("validityDays", parseInt(event.target.value) || 30)
              }
              className={touchInput}
            />
          </Field>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className={`${touchBtnSecondary} w-full sm:w-auto`}
          >
            Back
          </button>
          <button
            type="submit"
            className={`${touchBtnPrimary} w-full sm:w-auto`}
          >
            Continue to Preview
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
