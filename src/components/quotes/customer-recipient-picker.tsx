"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/profile/searchable-select";
import { touchBtnPrimary, touchBtnSecondary, touchInput } from "@/components/quotes/ui";
import {
  isContactPickerSupported,
  pickContactForQuote,
} from "@/lib/customer-contacts";
import type { CustomerSelectionMode } from "@/lib/quotes";
import { createClient } from "@/lib/supabase";
import { getCustomerDisplayName, type Customer } from "@/types/customer";

export type RecipientSendMode = "contact" | "existing" | "new";

interface CustomerRecipientPickerProps {
  customerMode: CustomerSelectionMode;
  selectedCustomerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onModeChange: (mode: CustomerSelectionMode) => void;
  onSelectCustomer: (customerId: string | null) => void;
  onChange: (field: "customerName" | "customerEmail" | "customerPhone", value: string) => void;
  onSend: () => void | Promise<void>;
  isSending?: boolean;
  sendLabel?: string;
}

export function CustomerRecipientPicker({
  customerMode,
  selectedCustomerId,
  customerName,
  customerEmail,
  customerPhone,
  onModeChange,
  onSelectCustomer,
  onChange,
  onSend,
  isSending = false,
  sendLabel = "Send Quote",
}: CustomerRecipientPickerProps) {
  const [sendMode, setSendMode] = useState<RecipientSendMode>(
    isContactPickerSupported() ? "contact" : "existing"
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isImportingContact, setIsImportingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const contactPickerSupported = isContactPickerSupported();

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

    onModeChange("existing");
    onSelectCustomer(customerId);
    onChange("customerName", getCustomerDisplayName(customer));
    onChange("customerEmail", customer.email ?? "");
    onChange("customerPhone", customer.phone ?? "");
  }

  function handleUseExistingCustomer() {
    if (!duplicateCustomer) return;
    setSendMode("existing");
    handleSelectExistingCustomer(duplicateCustomer.id);
  }

  async function handlePickContact() {
    setIsImportingContact(true);
    setContactError(null);

    try {
      const imported = await pickContactForQuote();
      if (!imported) {
        return;
      }

      onModeChange("new");
      onSelectCustomer(null);
      onChange("customerName", imported.customerName);
      onChange("customerEmail", imported.customerEmail);
      onChange("customerPhone", imported.customerPhone);
    } catch (err) {
      setContactError(
        err instanceof Error
          ? err.message
          : "Failed to import contact. Please enter details manually."
      );
    } finally {
      setIsImportingContact(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSend();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div
        className={`grid gap-3 ${contactPickerSupported ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}
      >
        {contactPickerSupported && (
          <button
            type="button"
            onClick={() => setSendMode("contact")}
            className={modeButtonClass(sendMode === "contact")}
          >
            <p className="text-sm font-semibold text-white">Phone contact</p>
            <p className="mt-1 text-xs text-slate-400">Pick from device</p>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setSendMode("existing");
            onModeChange("existing");
          }}
          className={modeButtonClass(sendMode === "existing")}
        >
          <p className="text-sm font-semibold text-white">Saved customer</p>
          <p className="mt-1 text-xs text-slate-400">Search your list</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSendMode("new");
            onModeChange("new");
            onSelectCustomer(null);
          }}
          className={modeButtonClass(sendMode === "new")}
        >
          <p className="text-sm font-semibold text-white">New contact</p>
          <p className="mt-1 text-xs text-slate-400">Enter manually</p>
        </button>
      </div>

      {sendMode === "contact" && contactPickerSupported && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handlePickContact}
            disabled={isImportingContact || isSending}
            className={`${touchBtnSecondary} w-full`}
          >
            {isImportingContact ? "Opening contacts..." : "Import from Contacts"}
          </button>
          {contactError && (
            <p className="text-sm text-red-400">{contactError}</p>
          )}
        </div>
      )}

      {(sendMode === "existing" || sendMode === "contact") && (
        <div className="space-y-4">
          {sendMode === "existing" && (
            <Field label="Saved customer">
              {isLoadingCustomers ? (
                <p className="text-sm text-slate-400">Loading customers...</p>
              ) : customers.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No saved customers yet. Switch to new contact.
                </p>
              ) : (
                <SearchableSelect
                  id="materials-customer-select"
                  options={customerOptions}
                  value={selectedCustomerId ?? ""}
                  onChange={handleSelectExistingCustomer}
                  placeholder="Search customers..."
                  emptyQueryMaxResults={customers.length}
                />
              )}
            </Field>
          )}

          <RecipientFields
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            onChange={onChange}
          />
        </div>
      )}

      {sendMode === "new" && (
        <div className="space-y-4">
          <RecipientFields
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            onChange={onChange}
          />

          {duplicateCustomer && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
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

      <button
        type="submit"
        disabled={
          isSending ||
          !customerName.trim() ||
          !customerEmail.trim()
        }
        className={`${touchBtnPrimary} w-full disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isSending ? "Sending..." : sendLabel}
      </button>
    </form>
  );
}

function modeButtonClass(isActive: boolean) {
  return `rounded-xl border px-3 py-3 text-left transition ${
    isActive
      ? "border-accent bg-accent/10"
      : "border-white/10 bg-white/[0.03] hover:border-white/20"
  }`;
}

function RecipientFields({
  customerName,
  customerEmail,
  customerPhone,
  onChange,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onChange: (
    field: "customerName" | "customerEmail" | "customerPhone",
    value: string
  ) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Customer name" className="sm:col-span-2">
        <input
          type="text"
          value={customerName}
          onChange={(event) => onChange("customerName", event.target.value)}
          className={touchInput}
          placeholder="John Smith"
        />
      </Field>

      <Field label="Customer email">
        <input
          type="email"
          value={customerEmail}
          onChange={(event) => onChange("customerEmail", event.target.value)}
          className={touchInput}
          placeholder="john@example.com"
        />
      </Field>

      <Field label="Customer phone">
        <input
          type="tel"
          value={customerPhone}
          onChange={(event) => onChange("customerPhone", event.target.value)}
          className={touchInput}
          placeholder="(416) 555-0123"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
