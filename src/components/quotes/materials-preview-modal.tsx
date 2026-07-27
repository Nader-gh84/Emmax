"use client";

import { QuoteLivePreview } from "@/components/quotes/quote-live-preview";
import { CustomerRecipientPicker } from "@/components/quotes/customer-recipient-picker";
import { touchBtnSecondary } from "@/components/quotes/ui";
import type { CustomerSelectionMode } from "@/lib/quotes";
import type { MaterialItem } from "@/types/quote";

interface MaterialsPreviewModalProps {
  materials: MaterialItem[];
  taxRate: number;
  projectName: string;
  notes: string;
  customerMode: CustomerSelectionMode;
  selectedCustomerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onModeChange: (mode: CustomerSelectionMode) => void;
  onSelectCustomer: (customerId: string | null) => void;
  onCustomerChange: (
    field: "customerName" | "customerEmail" | "customerPhone",
    value: string
  ) => void;
  onSend: () => void | Promise<void>;
  isSending: boolean;
  onClose: () => void;
}

export function MaterialsPreviewModal({
  materials,
  taxRate,
  projectName,
  notes,
  customerMode,
  selectedCustomerId,
  customerName,
  customerEmail,
  customerPhone,
  onModeChange,
  onSelectCustomer,
  onCustomerChange,
  onSend,
  isSending,
  onClose,
}: MaterialsPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Preview Quote</h2>
            <p className="mt-1 text-sm text-slate-400">
              Review and send to a customer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-white"
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          <QuoteLivePreview
            materials={materials}
            taxRate={taxRate}
            customerName={customerName || undefined}
            projectName={projectName || notes.slice(0, 40) || undefined}
          />
        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
          <h3 className="text-base font-semibold text-white">Send options</h3>
          <div className="mt-4">
            <CustomerRecipientPicker
              customerMode={customerMode}
              selectedCustomerId={selectedCustomerId}
              customerName={customerName}
              customerEmail={customerEmail}
              customerPhone={customerPhone}
              onModeChange={onModeChange}
              onSelectCustomer={onSelectCustomer}
              onChange={onCustomerChange}
              onSend={onSend}
              isSending={isSending}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
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
