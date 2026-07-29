"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/profile/searchable-select";
import { CustomerRecipientPicker } from "@/components/quotes/customer-recipient-picker";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import { buildDefaultSupplierMessage } from "@/lib/email/supplier-email";
import type { CustomerSelectionMode } from "@/lib/quotes";
import { createClient } from "@/lib/supabase";
import { getCustomerDisplayName, type Customer } from "@/types/customer";
import type { Supplier } from "@/types/supplier";

function ModalShell({
  title,
  description,
  onClose,
  children,
  wide,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div
        className={`relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-white/10 bg-navy p-6 shadow-xl ${
          wide ? "max-w-xl" : "max-w-lg"
        }`}
      >
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

export function SendToSupplierModal({
  materials,
  isSending,
  onClose,
  onSend,
}: {
  materials: Array<{
    item: string;
    brand: string;
    quantity: number;
    unit: string;
  }>;
  isSending: boolean;
  onClose: () => void;
  onSend: (payload: {
    supplier: Supplier;
    supplierEmail: string;
    messageBody: string;
  }) => void | Promise<void>;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const supabase = createClient();
      const [{ data: supplierRows }, profileResult, authResult] =
        await Promise.all([
          supabase
            .from("suppliers")
            .select("*")
            .order("supplier_name", { ascending: true }),
          supabase
            .from("business_profiles")
            .select("company_name, full_name")
            .maybeSingle(),
          supabase.auth.getUser(),
        ]);

      setSuppliers((supplierRows as Supplier[]) ?? []);

      const profile = profileResult.data;
      const user = authResult.data.user;
      const companyName = profile?.company_name?.trim() || "";
      const metaName =
        typeof user?.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "";
      const ownerName =
        profile?.full_name?.trim() || metaName.trim() || "";

      setMessageBody(buildDefaultSupplierMessage(companyName, ownerName));
      setProfileReady(true);
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

  function handleSelectSupplier(nextId: string) {
    setValue(nextId);
    const next = suppliers.find((supplier) => supplier.id === nextId) ?? null;
    setSupplierEmail(next?.email?.trim() || "");
  }

  const canSend =
    Boolean(selected) &&
    supplierEmail.trim().length > 0 &&
    messageBody.trim().length > 0 &&
    materials.length > 0 &&
    !isSending;

  return (
    <ModalShell
      title="Send to Supplier"
      description="Request pricing for materials only — no labour or prices are included."
      onClose={onClose}
      wide
    >
      {isLoading || !profileReady ? (
        <p className="text-sm text-slate-400">Loading suppliers…</p>
      ) : suppliers.length === 0 ? (
        <p className="text-sm text-slate-400">
          No suppliers yet. Add suppliers from the Suppliers page first.
        </p>
      ) : (
        <>
          <label
            htmlFor="voice-quote-supplier-select"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Supplier
          </label>
          <SearchableSelect
            id="voice-quote-supplier-select"
            options={options}
            value={value}
            onChange={handleSelectSupplier}
            placeholder="Search suppliers…"
            emptyQueryMaxResults={suppliers.length}
          />

          <label
            htmlFor="voice-quote-supplier-email"
            className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Supplier email
          </label>
          <input
            id="voice-quote-supplier-email"
            type="email"
            value={supplierEmail}
            onChange={(event) => setSupplierEmail(event.target.value)}
            placeholder="orders@supplier.com"
            className={touchInput}
            disabled={!selected}
          />

          <label
            htmlFor="voice-quote-supplier-message"
            className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Message
          </label>
          <textarea
            id="voice-quote-supplier-message"
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            rows={7}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-accent"
          />

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Materials to send ({materials.length})
            </p>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-navy text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Description</th>
                    <th className="px-3 py-2 font-semibold">Brand</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2 font-semibold">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material, index) => (
                    <tr
                      key={`${material.item}-${index}`}
                      className="border-t border-white/5 text-slate-300"
                    >
                      <td className="px-3 py-2 text-white">
                        {material.item || "Material"}
                      </td>
                      <td className="px-3 py-2">
                        {material.brand?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {material.quantity}
                      </td>
                      <td className="px-3 py-2">{material.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Labour and unit prices are never included in supplier requests.
            </p>
          </div>
        </>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSending}
          className={`${touchBtnSecondary} flex-1`}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSend || !selected}
          onClick={() => {
            if (!selected) return;
            void onSend({
              supplier: selected,
              supplierEmail: supplierEmail.trim(),
              messageBody: messageBody.trim(),
            });
          }}
          className={`${touchBtnPrimary} flex-1`}
        >
          {isSending ? "Sending…" : "Send to supplier"}
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
