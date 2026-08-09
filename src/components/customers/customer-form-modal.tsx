"use client";

import { useEffect, useRef, useState } from "react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";
import { isContactPickerSupported } from "@/lib/customer-contacts";
import {
  createCustomerAvatarSignedUrl,
  validateCustomerAvatarFile,
} from "@/lib/customer-avatar-storage";
import {
  getCustomerDisplayName,
  type CustomerFormData,
  type CustomerGender,
  type CustomerType,
} from "@/types/customer";

export function CustomerFormModal({
  title,
  initialForm,
  isSaving,
  isImporting,
  onClose,
  onSubmit,
  onImportContact,
  /** When set (edit mode), photo upload is available. */
  customerId = null,
  currentAvatarPath = null,
}: {
  title: string;
  initialForm: CustomerFormData;
  isSaving: boolean;
  isImporting: boolean;
  onClose: () => void;
  onSubmit: (
    form: CustomerFormData,
    options?: { avatarFile?: File | null; removeAvatar?: boolean }
  ) => Promise<void>;
  onImportContact: () => Promise<void>;
  customerId?: string | null;
  currentAvatarPath?: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<CustomerFormData>(initialForm);
  const [contactPickerSupported, setContactPickerSupported] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    setForm(initialForm);
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
    setAvatarError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [initialForm]);

  useEffect(() => {
    setContactPickerSupported(isContactPickerSupported());
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!currentAvatarPath || removeAvatar) {
      setExistingAvatarUrl(null);
      return;
    }
    void createCustomerAvatarSignedUrl(currentAvatarPath).then((url) => {
      if (!cancelled) setExistingAvatarUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [currentAvatarPath, removeAvatar]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  function updateField<K extends keyof CustomerFormData>(
    key: K,
    value: CustomerFormData[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleAvatarPick(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const error = validateCustomerAvatarFile(file);
    if (error) {
      setAvatarError(error);
      return;
    }
    setAvatarError(null);
    setRemoveAvatar(false);
    setAvatarFile(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) return;
    await onSubmit(form, {
      avatarFile: customerId ? avatarFile : null,
      removeAvatar: customerId ? removeAvatar : false,
    });
  }

  const previewName =
    getCustomerDisplayName({
      first_name: form.first_name || "Customer",
      last_name: form.last_name || "",
    }) || "Customer";

  const displayImageUrl = avatarPreview || (!removeAvatar ? existingAvatarUrl : null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!isSaving && !isImporting) onClose();
        }}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">{title}</h2>

        <div className="mt-6 space-y-4">
          {contactPickerSupported ? (
            <button
              type="button"
              onClick={onImportContact}
              disabled={isSaving || isImporting}
              className={`${touchBtnSecondary} w-full`}
            >
              {isImporting ? "Opening contacts..." : "Import from Contacts"}
            </button>
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
              Contact import isn&apos;t supported on this device — please
              enter details manually below.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="customer-first-name"
                className="block text-base font-medium text-slate-300"
              >
                First Name <span className="text-accent">*</span>
              </label>
              <input
                id="customer-first-name"
                type="text"
                value={form.first_name}
                onChange={(event) =>
                  updateField("first_name", event.target.value)
                }
                className={`${touchInput} mt-1.5`}
                placeholder="First name"
                required
                autoComplete="given-name"
              />
            </div>

            <div>
              <label
                htmlFor="customer-last-name"
                className="block text-base font-medium text-slate-300"
              >
                Last Name <span className="text-accent">*</span>
              </label>
              <input
                id="customer-last-name"
                type="text"
                value={form.last_name}
                onChange={(event) =>
                  updateField("last_name", event.target.value)
                }
                className={`${touchInput} mt-1.5`}
                placeholder="Last name"
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="customer-email"
              className="block text-base font-medium text-slate-300"
            >
              Email
            </label>
            <input
              id="customer-email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="customer-phone"
              className="block text-base font-medium text-slate-300"
            >
              Phone
            </label>
            <input
              id="customer-phone"
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
              htmlFor="customer-address"
              className="block text-base font-medium text-slate-300"
            >
              Address
            </label>
            <input
              id="customer-address"
              type="text"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
              autoComplete="street-address"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="customer-type"
                className="block text-base font-medium text-slate-300"
              >
                Customer Type
              </label>
              <select
                id="customer-type"
                value={form.customer_type}
                onChange={(event) =>
                  updateField(
                    "customer_type",
                    event.target.value as CustomerType
                  )
                }
                className={`${touchInput} mt-1.5`}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="customer-gender"
                className="block text-base font-medium text-slate-300"
              >
                Gender
              </label>
              <select
                id="customer-gender"
                value={form.gender}
                onChange={(event) =>
                  updateField("gender", event.target.value as CustomerGender)
                }
                className={`${touchInput} mt-1.5`}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unspecified">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="customer-website"
              className="block text-base font-medium text-slate-300"
            >
              Website
            </label>
            <input
              id="customer-website"
              type="url"
              value={form.website}
              onChange={(event) => updateField("website", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Optional"
              autoComplete="url"
            />
          </div>

          {customerId ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-base font-medium text-slate-300">Photo</p>
              <p className="mt-1 text-xs text-slate-500">
                Optional. Images up to 2 MB. Overrides the gender illustration.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <EntityAvatar
                  name={previewName}
                  size="lg"
                  imageUrl={displayImageUrl}
                  gender={form.gender}
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleAvatarPick(event.target.files)}
                  />
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => fileInputRef.current?.click()}
                    className={touchBtnSecondary}
                  >
                    {avatarFile || existingAvatarUrl
                      ? "Change photo"
                      : "Upload photo"}
                  </button>
                  {(avatarFile || existingAvatarUrl) && !removeAvatar ? (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setAvatarFile(null);
                        setRemoveAvatar(true);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-sm font-medium text-red-200"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
              {avatarError ? (
                <p className="mt-3 text-sm text-red-300">{avatarError}</p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="customer-notes"
              className="block text-base font-medium text-slate-300"
            >
              Notes
            </label>
            <textarea
              id="customer-notes"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className={`${touchTextarea} mt-1.5 min-h-[96px]`}
              placeholder="Optional"
            />
          </div>

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
              disabled={
                isSaving || !form.first_name.trim() || !form.last_name.trim()
              }
              className={`${touchBtnPrimary} w-full sm:w-auto`}
            >
              {isSaving ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
