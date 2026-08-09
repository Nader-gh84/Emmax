"use client";

import { useEffect, useRef, useState } from "react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import {
  createSupplierLogoSignedUrl,
  validateSupplierLogoFile,
} from "@/lib/supplier-logo-storage";
import {
  ORDER_METHODS,
  PAYMENT_TERMS_OPTIONS,
  type SupplierFormData,
  type SupplierPaymentTermsType,
} from "@/types/supplier";

export function SupplierFormModal({
  title,
  initialForm,
  isSaving,
  onClose,
  onSubmit,
  supplierId = null,
  currentLogoPath = null,
}: {
  title: string;
  initialForm: SupplierFormData;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (
    form: SupplierFormData,
    options?: { logoFile?: File | null; removeLogo?: boolean }
  ) => Promise<void>;
  supplierId?: string | null;
  currentLogoPath?: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<SupplierFormData>(initialForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialForm);
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(false);
    setLogoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [initialForm]);

  useEffect(() => {
    let cancelled = false;
    if (!currentLogoPath || removeLogo) {
      setExistingLogoUrl(null);
      return;
    }
    void createSupplierLogoSignedUrl(currentLogoPath).then((url) => {
      if (!cancelled) setExistingLogoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [currentLogoPath, removeLogo]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  function updateField(key: keyof SupplierFormData, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleLogoPick(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const error = validateSupplierLogoFile(file);
    if (error) {
      setLogoError(error);
      return;
    }
    setLogoError(null);
    setRemoveLogo(false);
    setLogoFile(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.supplier_name.trim()) return;
    await onSubmit(form, {
      logoFile: supplierId ? logoFile : null,
      removeLogo: supplierId ? removeLogo : false,
    });
  }

  const displayImageUrl =
    logoPreview || (!removeLogo ? existingLogoUrl : null);

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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="supplier-name"
              className="block text-base font-medium text-slate-300"
            >
              Supplier Name <span className="text-accent">*</span>
            </label>
            <input
              id="supplier-name"
              type="text"
              value={form.supplier_name}
              onChange={(event) =>
                updateField("supplier_name", event.target.value)
              }
              className={`${touchInput} mt-1.5`}
              placeholder="e.g. ABC Electrical Supply"
              required
            />
          </div>

          <div>
            <label
              htmlFor="supplier-contact"
              className="block text-base font-medium text-slate-300"
            >
              Contact Person
            </label>
            <input
              id="supplier-contact"
              type="text"
              value={form.contact_person}
              onChange={(event) =>
                updateField("contact_person", event.target.value)
              }
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
            />
          </div>

          <div>
            <label
              htmlFor="supplier-email"
              className="block text-base font-medium text-slate-300"
            >
              Email
            </label>
            <input
              id="supplier-email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
            />
          </div>

          <div>
            <label
              htmlFor="supplier-phone"
              className="block text-base font-medium text-slate-300"
            >
              Phone
            </label>
            <input
              id="supplier-phone"
              type="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
            />
          </div>

          <div>
            <label
              htmlFor="supplier-location"
              className="block text-base font-medium text-slate-300"
            >
              Location / Branch
            </label>
            <input
              id="supplier-location"
              type="text"
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
            />
          </div>

          <div>
            <label
              htmlFor="supplier-order-method"
              className="block text-base font-medium text-slate-300"
            >
              Preferred Order Method
            </label>
            <select
              id="supplier-order-method"
              value={form.preferred_order_method}
              onChange={(event) =>
                updateField("preferred_order_method", event.target.value)
              }
              className={`${touchInput} mt-1.5 appearance-none`}
            >
              <option value="">Select method (optional)</option>
              {ORDER_METHODS.map((method) => (
                <option
                  key={method}
                  value={method}
                  className="bg-navy text-white"
                >
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="supplier-payment-terms"
              className="block text-base font-medium text-slate-300"
            >
              Payment Terms
            </label>
            <select
              id="supplier-payment-terms"
              value={form.payment_terms_type}
              onChange={(event) =>
                updateField(
                  "payment_terms_type",
                  event.target.value as SupplierPaymentTermsType
                )
              }
              className={`${touchInput} mt-1.5 appearance-none`}
            >
              {PAYMENT_TERMS_OPTIONS.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  className="bg-navy text-white"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="supplier-account-number"
              className="block text-base font-medium text-slate-300"
            >
              Default Account #
            </label>
            <input
              id="supplier-account-number"
              type="text"
              value={form.default_account_number}
              onChange={(event) =>
                updateField("default_account_number", event.target.value)
              }
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="supplier-credit-limit"
                className="block text-base font-medium text-slate-300"
              >
                Credit Limit
              </label>
              <input
                id="supplier-credit-limit"
                type="number"
                min="0"
                step="0.01"
                value={form.credit_limit}
                onChange={(event) =>
                  updateField("credit_limit", event.target.value)
                }
                className={`${touchInput} mt-1.5`}
                placeholder="Optional"
              />
            </div>
            <div>
              <label
                htmlFor="supplier-min-monthly"
                className="block text-base font-medium text-slate-300"
              >
                Min. Monthly Payment
              </label>
              <input
                id="supplier-min-monthly"
                type="number"
                min="0"
                step="0.01"
                value={form.minimum_monthly_payment}
                onChange={(event) =>
                  updateField("minimum_monthly_payment", event.target.value)
                }
                className={`${touchInput} mt-1.5`}
                placeholder="Optional"
              />
            </div>
          </div>

          {supplierId ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-base font-medium text-slate-300">
                Company Logo
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Optional. Images up to 2 MB. Manual upload only.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <EntityAvatar
                  name={form.supplier_name || "Supplier"}
                  size="lg"
                  imageUrl={displayImageUrl}
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleLogoPick(event.target.files)}
                  />
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => fileInputRef.current?.click()}
                    className={touchBtnSecondary}
                  >
                    {logoFile || existingLogoUrl
                      ? "Change logo"
                      : "Upload logo"}
                  </button>
                  {(logoFile || existingLogoUrl) && !removeLogo ? (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setLogoFile(null);
                        setRemoveLogo(true);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-sm font-medium text-red-200"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
              {logoError ? (
                <p className="mt-3 text-sm text-red-300">{logoError}</p>
              ) : null}
            </div>
          ) : null}

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
              disabled={isSaving || !form.supplier_name.trim()}
              className={`${touchBtnPrimary} w-full sm:w-auto`}
            >
              {isSaving ? "Saving..." : "Save Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
