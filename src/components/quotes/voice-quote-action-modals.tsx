"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/profile/searchable-select";
import { CustomerRecipientPicker } from "@/components/quotes/customer-recipient-picker";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import type { CustomerSelectionMode } from "@/lib/quotes";
import { createClient } from "@/lib/supabase";
import { getCustomerDisplayName, type Customer } from "@/types/customer";
import type { Supplier } from "@/types/supplier";

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-navy p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-400">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function CustomerSelectModal({
  selectedCustomerId,
  onClose,
  onSelect,
}: {
  selectedCustomerId: string | null;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState(selectedCustomerId ?? "");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("customers")
        .select("*")
        .order("last_quoted_at", { ascending: false, nullsFirst: false })
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });
      setCustomers((data as Customer[]) ?? []);
      setIsLoading(false);
    }
    void load();
  }, []);

  const options = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: getCustomerDisplayName(customer),
        hint: [customer.email, customer.phone, customer.notes]
          .filter(Boolean)
          .join(" · "),
      })),
    [customers]
  );

  const selected = customers.find((customer) => customer.id === value) ?? null;

  return (
    <ModalShell
      title="Select customer"
      description="Choose a saved customer for this pre-invoice."
      onClose={onClose}
    >
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading customers…</p>
      ) : customers.length === 0 ? (
        <p className="text-sm text-slate-400">
          No saved customers yet. Add one from Customers or use Send to New
          Customer.
        </p>
      ) : (
        <SearchableSelect
          id="voice-quote-customer-select"
          options={options}
          value={value}
          onChange={setValue}
          placeholder="Search customers…"
          emptyQueryMaxResults={customers.length}
        />
      )}

      {selected ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          <p className="font-medium text-white">
            {getCustomerDisplayName(selected)}
          </p>
          {selected.notes ? (
            <p className="mt-1 text-slate-400">{selected.notes}</p>
          ) : null}
          <p className="mt-1 break-all text-slate-400">
            {selected.email || "No email on file"}
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onClose} className={`${touchBtnSecondary} flex-1`}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className={`${touchBtnPrimary} flex-1`}
        >
          Use customer
        </button>
      </div>
    </ModalShell>
  );
}

export function ProjectEditModal({
  projectName,
  onClose,
  onSave,
}: {
  projectName: string;
  onClose: () => void;
  onSave: (projectName: string) => void;
}) {
  const [value, setValue] = useState(projectName);

  return (
    <ModalShell
      title="Project name"
      description="Name this job for the pre-invoice and PDF."
      onClose={onClose}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="e.g. Kitchen Reno — Phase 2"
        className={touchInput}
        autoFocus
      />
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onClose} className={`${touchBtnSecondary} flex-1`}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(value.trim())}
          className={`${touchBtnPrimary} flex-1`}
        >
          Save
        </button>
      </div>
    </ModalShell>
  );
}

export function ValidUntilModal({
  validUntil,
  onClose,
  onSave,
}: {
  validUntil: string | null;
  onClose: () => void;
  onSave: (validUntil: string) => void;
}) {
  const [value, setValue] = useState(validUntil ?? "");

  return (
    <ModalShell
      title="Valid until"
      description="Choose the expiry date shown on the quote."
      onClose={onClose}
    >
      <input
        type="date"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={touchInput}
      />
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onClose} className={`${touchBtnSecondary} flex-1`}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!value}
          onClick={() => onSave(value)}
          className={`${touchBtnPrimary} flex-1`}
        >
          Save
        </button>
      </div>
    </ModalShell>
  );
}

export function SendQuoteModal({
  mode,
  customerMode,
  selectedCustomerId,
  customerName,
  customerEmail,
  customerPhone,
  isSending,
  onClose,
  onModeChange,
  onSelectCustomer,
  onChange,
  onSend,
}: {
  mode: "contact" | "new";
  customerMode: CustomerSelectionMode;
  selectedCustomerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  isSending: boolean;
  onClose: () => void;
  onModeChange: (mode: CustomerSelectionMode) => void;
  onSelectCustomer: (customerId: string | null) => void;
  onChange: (
    field: "customerName" | "customerEmail" | "customerPhone",
    value: string
  ) => void;
  onSend: () => void | Promise<void>;
}) {
  useEffect(() => {
    onModeChange(mode === "contact" ? "existing" : "new");
    if (mode === "new") {
      onSelectCustomer(null);
    }
    // Intentionally run when modal mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <ModalShell
      title={mode === "contact" ? "Send to Contact" : "Send to New Customer"}
      description={
        mode === "contact"
          ? "Pick a saved customer and send the quote email."
          : "Enter customer details, save them, and send the quote."
      }
      onClose={onClose}
    >
      <CustomerRecipientPicker
        customerMode={customerMode}
        selectedCustomerId={selectedCustomerId}
        customerName={customerName}
        customerEmail={customerEmail}
        customerPhone={customerPhone}
        onModeChange={onModeChange}
        onSelectCustomer={onSelectCustomer}
        onChange={onChange}
        onSend={onSend}
        isSending={isSending}
        sendLabel={isSending ? "Sending…" : "Send quote"}
        initialSendMode={mode === "contact" ? "existing" : "new"}
      />
    </ModalShell>
  );
}

export function SupplierSelectModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (supplier: Supplier) => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState("");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("suppliers")
        .select("*")
        .order("supplier_name", { ascending: true });
      setSuppliers((data as Supplier[]) ?? []);
      setIsLoading(false);
    }
    void load();
  }, []);

  const options = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.supplier_name,
        hint: [supplier.email, supplier.phone, supplier.contact_person]
          .filter(Boolean)
          .join(" · "),
      })),
    [suppliers]
  );

  const selected = suppliers.find((supplier) => supplier.id === value) ?? null;

  return (
    <ModalShell
      title="Send to Supplier"
      description="Share the materials list (quantities needed) with a supplier."
      onClose={onClose}
    >
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading suppliers…</p>
      ) : suppliers.length === 0 ? (
        <p className="text-sm text-slate-400">
          No suppliers yet. Add suppliers from the Suppliers page first.
        </p>
      ) : (
        <SearchableSelect
          id="voice-quote-supplier-select"
          options={options}
          value={value}
          onChange={setValue}
          placeholder="Search suppliers…"
          emptyQueryMaxResults={suppliers.length}
        />
      )}

      {selected ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          <p className="font-medium text-white">{selected.supplier_name}</p>
          <p className="mt-1 break-all text-slate-400">
            {selected.email || "No email — we’ll open a blank mail draft"}
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onClose} className={`${touchBtnSecondary} flex-1`}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className={`${touchBtnPrimary} flex-1`}
        >
          Share materials
        </button>
      </div>
    </ModalShell>
  );
}

export function NotesEditModal({
  notes,
  onClose,
  onSave,
}: {
  notes: string;
  onClose: () => void;
  onSave: (notes: string) => void;
}) {
  const [value, setValue] = useState(notes);

  return (
    <ModalShell title="Notes / scope" onClose={onClose}>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={5}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-accent"
        placeholder="Scope notes for the customer-facing quote"
      />
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onClose} className={`${touchBtnSecondary} flex-1`}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(value.trim())}
          className={`${touchBtnPrimary} flex-1`}
        >
          Save
        </button>
      </div>
    </ModalShell>
  );
}
