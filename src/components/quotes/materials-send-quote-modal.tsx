"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/profile/searchable-select";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import type { QuoteSendRecipient } from "@/lib/quote-actions";
import { createClient } from "@/lib/supabase";
import { getCustomerDisplayName, type Customer } from "@/types/customer";

interface MaterialsSendQuoteModalProps {
  initialCustomerName?: string;
  initialCustomerEmail?: string;
  initialCustomerPhone?: string;
  onSend: (recipient: QuoteSendRecipient) => Promise<void>;
  onClose: () => void;
}

type SectionFeedback = {
  message: string;
  type: "success" | "error";
} | null;

export function MaterialsSendQuoteModal({
  initialCustomerName = "",
  initialCustomerEmail = "",
  initialCustomerPhone = "",
  onSend,
  onClose,
}: MaterialsSendQuoteModalProps) {
  const [manualName, setManualName] = useState(initialCustomerName);
  const [manualEmail, setManualEmail] = useState(initialCustomerEmail);
  const [manualPhone, setManualPhone] = useState(initialCustomerPhone);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [manualFeedback, setManualFeedback] = useState<SectionFeedback>(null);
  const [contactFeedback, setContactFeedback] = useState<SectionFeedback>(null);

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
    const normalizedEmail = manualEmail.trim().toLowerCase();
    if (!normalizedEmail) return null;

    return (
      customers.find(
        (customer) =>
          customer.email?.trim().toLowerCase() === normalizedEmail
      ) ?? null
    );
  }, [customers, manualEmail]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  function handleUseExistingCustomer() {
    if (!duplicateCustomer) return;

    setSelectedCustomerId(duplicateCustomer.id);
    setManualName(getCustomerDisplayName(duplicateCustomer));
    setManualEmail(duplicateCustomer.email ?? "");
    setManualPhone(duplicateCustomer.phone ?? "");
    setManualFeedback(null);
  }

  async function handleManualSend() {
    if (!manualName.trim() || !manualEmail.trim()) {
      setManualFeedback({
        message: "Customer name and email are required.",
        type: "error",
      });
      return;
    }

    setIsSendingManual(true);
    setManualFeedback(null);

    try {
      await onSend({
        customerMode: "new",
        selectedCustomerId: null,
        customerName: manualName.trim(),
        customerEmail: manualEmail.trim(),
        customerPhone: manualPhone.trim(),
      });
      setManualFeedback({
        message: `Quote sent to ${manualEmail.trim()}!`,
        type: "success",
      });
    } catch (err) {
      setManualFeedback({
        message: err instanceof Error ? err.message : "Failed to send quote",
        type: "error",
      });
    } finally {
      setIsSendingManual(false);
    }
  }

  async function handleContactSend() {
    if (!selectedCustomer) {
      setContactFeedback({
        message: "Select a saved customer to send this quote.",
        type: "error",
      });
      return;
    }

    if (!selectedCustomer.email?.trim()) {
      setContactFeedback({
        message: "Selected customer does not have an email address.",
        type: "error",
      });
      return;
    }

    setIsSendingContact(true);
    setContactFeedback(null);

    try {
      await onSend({
        customerMode: "existing",
        selectedCustomerId: selectedCustomer.id,
        customerName: getCustomerDisplayName(selectedCustomer),
        customerEmail: selectedCustomer.email.trim(),
        customerPhone: selectedCustomer.phone ?? "",
      });
      setContactFeedback({
        message: `Quote sent to ${selectedCustomer.email.trim()}!`,
        type: "success",
      });
    } catch (err) {
      setContactFeedback({
        message: err instanceof Error ? err.message : "Failed to send quote",
        type: "error",
      });
    } finally {
      setIsSendingContact(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Send Quote</h2>
            <p className="mt-1 text-sm text-slate-400">
              Send this quote by email with the PDF attached.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-400 transition hover:text-white"
            aria-label="Close send quote panel"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-base font-semibold text-white">Manual entry</h3>
            <p className="mt-1 text-sm text-slate-400">
              Enter customer details to send this quote.
            </p>

            <div className="mt-4 space-y-4">
              <Field label="Customer name" required>
                <input
                  type="text"
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  className={touchInput}
                  placeholder="John Smith"
                />
              </Field>

              <Field label="Email" required>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(event) => setManualEmail(event.target.value)}
                  className={touchInput}
                  placeholder="john@example.com"
                />
              </Field>

              <Field label="Phone">
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(event) => setManualPhone(event.target.value)}
                  className={touchInput}
                  placeholder="(416) 555-0123"
                />
              </Field>

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

              {manualFeedback && (
                <FeedbackBanner feedback={manualFeedback} />
              )}

              <button
                type="button"
                onClick={handleManualSend}
                disabled={
                  isSendingManual ||
                  !manualName.trim() ||
                  !manualEmail.trim()
                }
                className={`${touchBtnPrimary} w-full disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isSendingManual ? "Sending..." : "Send"}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-base font-semibold text-white">
              Send for my contact
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Choose a saved customer from your list.
            </p>

            <div className="mt-4 space-y-4">
              <Field label="Saved customer">
                {isLoadingCustomers ? (
                  <p className="text-sm text-slate-400">Loading customers...</p>
                ) : customers.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-400">
                    No saved customers yet. Use manual entry or add customers
                    from the Customers page.
                  </p>
                ) : (
                  <SearchableSelect
                    id="materials-send-customer-select"
                    options={customerOptions}
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    placeholder="Search customers..."
                    emptyQueryMaxResults={customers.length}
                  />
                )}
              </Field>

              {selectedCustomer && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
                  <p className="font-medium text-white">
                    {getCustomerDisplayName(selectedCustomer)}
                  </p>
                  <p className="mt-1 break-all text-slate-400">
                    {selectedCustomer.email || "No email on file"}
                  </p>
                  {selectedCustomer.phone && (
                    <p className="mt-1 text-slate-400">{selectedCustomer.phone}</p>
                  )}
                </div>
              )}

              {contactFeedback && <FeedbackBanner feedback={contactFeedback} />}

              <button
                type="button"
                onClick={handleContactSend}
                disabled={
                  isSendingContact ||
                  !selectedCustomer ||
                  !selectedCustomer.email?.trim()
                }
                className={`${touchBtnPrimary} w-full disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isSendingContact ? "Sending..." : "Send"}
              </button>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`${touchBtnSecondary} w-full sm:w-auto`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

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

function FeedbackBanner({
  feedback,
}: {
  feedback: { message: string; type: "success" | "error" };
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        feedback.type === "success"
          ? "border-green-500/30 bg-green-500/10 text-green-400"
          : "border-red-500/30 bg-red-500/10 text-red-400"
      }`}
    >
      {feedback.message}
    </div>
  );
}
