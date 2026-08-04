"use client";

import { useEffect, useState } from "react";
import { ProfileFormFields } from "@/components/profile/profile-form-fields";
import { QuoteTemplatePicker } from "@/components/quotes/quote-template-picker";
import { touchBtnPrimary, touchInput } from "@/components/quotes/ui";
import {
  DEFAULT_COUNTRY,
  formatPhoneForStorage,
  parsePhoneFromStorage,
} from "@/lib/location";
import {
  DEFAULT_QUOTE_TEMPLATE,
  normalizeQuoteTemplate,
  type QuoteTemplateId,
} from "@/lib/pdf/quote-templates";
import { createClient } from "@/lib/supabase";
import {
  BRANDING_FIELDS,
  EMPTY_PROFILE,
  PROFILE_FIELDS,
  type ProfileData,
  type ProfileFieldKey,
  type QuoteDefaults,
} from "@/types/onboarding";

type SettingsFormData = ProfileData & QuoteDefaults;

const EMPTY_FORM: SettingsFormData = {
  ...EMPTY_PROFILE,
  defaultTaxRate: 13,
  defaultValidityDays: 30,
  quoteTemplate: DEFAULT_QUOTE_TEMPLATE,
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsFormData>(EMPTY_FORM);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to view settings.");
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("business_profiles")
        .select(
          "full_name, company_name, trade, country, city, email, phone, tagline, website, address, default_tax_rate, default_validity_days, quote_template"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        setError(
          fetchError.message?.includes("quote_template") ||
            fetchError.code === "42703"
            ? "Failed to load profile. Run migration 027_quote_template_and_branding.sql in Supabase."
            : "Failed to load profile. Please try again."
        );
        setIsLoading(false);
        return;
      }

      if (data) {
        const country = data.country || DEFAULT_COUNTRY;

        setForm({
          fullName: data.full_name ?? "",
          companyName: data.company_name ?? "",
          trade: data.trade ?? "",
          country,
          city: data.city ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          tagline: data.tagline ?? "",
          website: data.website ?? "",
          address: data.address ?? "",
          defaultTaxRate: Number(data.default_tax_rate) || 13,
          defaultValidityDays: Number(data.default_validity_days) || 30,
          quoteTemplate: normalizeQuoteTemplate(data.quote_template),
        });
        setPhoneLocal(parsePhoneFromStorage(data.phone, country));
      }

      setIsLoading(false);
    }

    void loadProfile();
  }, []);

  function updateField(key: ProfileFieldKey, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccess(false);
  }

  function handleCountryChange(country: string) {
    setForm((current) => ({
      ...current,
      country,
      city: current.country === country ? current.city : "",
    }));
    setSuccess(false);
  }

  function updateNumberField(
    key: "defaultTaxRate" | "defaultValidityDays",
    value: number
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccess(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const missingRequired = PROFILE_FIELDS.filter(
      (field) => !field.optional && !form[field.key]?.trim()
    );

    if (missingRequired.length > 0) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);

    try {
      const phone = formatPhoneForStorage(form.country, phoneLocal);

      const response = await fetch("/api/onboarding/save-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          companyName: form.companyName.trim(),
          trade: form.trade.trim(),
          country: form.country.trim(),
          city: form.city.trim(),
          email: form.email.trim(),
          phone,
          tagline: form.tagline.trim(),
          website: form.website.trim(),
          address: form.address.trim(),
          defaultTaxRate: form.defaultTaxRate,
          defaultValidityDays: form.defaultValidityDays,
          quoteTemplate: form.quoteTemplate,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save profile");
      }

      setForm((current) => ({ ...current, phone }));
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 lg:p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
        <p className="mt-4 text-base text-slate-400">Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-base text-slate-400">
          Update your business profile, branding, and quote PDF template.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <section className="space-y-5">
            <h2 className="text-lg font-semibold text-white">Business profile</h2>
            <ProfileFormFields
              profile={form}
              phoneLocal={phoneLocal}
              idPrefix="settings"
              onFieldChange={updateField}
              onPhoneLocalChange={(value) => {
                setPhoneLocal(value);
                setSuccess(false);
              }}
              onCountryChange={handleCountryChange}
            />
          </section>

          <section className="space-y-5">
            <h2 className="text-lg font-semibold text-white">
              PDF branding details
            </h2>
            <p className="text-sm text-slate-400">
              Used on quote PDFs. Logo upload is not available yet
              — templates use a built-in mark.
            </p>
            {BRANDING_FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`settings-${field.key}`}
                  className="block text-base font-medium text-slate-300"
                >
                  {field.label}
                  {field.optional ? (
                    <span className="ml-1 text-slate-500">(optional)</span>
                  ) : null}
                </label>
                <input
                  id={`settings-${field.key}`}
                  type="text"
                  value={form[field.key]}
                  onChange={(event) =>
                    updateField(field.key, event.target.value)
                  }
                  className={`${touchInput} mt-1.5`}
                  placeholder={
                    field.key === "tagline"
                      ? "Your Company Tagline Here"
                      : field.key === "website"
                        ? "www.example.com"
                        : "123 Main St"
                  }
                />
              </div>
            ))}
          </section>

          <section className="space-y-5">
            <h2 className="text-lg font-semibold text-white">Quote defaults</h2>
            <div>
              <label
                htmlFor="settings-defaultTaxRate"
                className="block text-base font-medium text-slate-300"
              >
                Default Tax Rate (%)
              </label>
              <input
                id="settings-defaultTaxRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.defaultTaxRate}
                onChange={(event) =>
                  updateNumberField(
                    "defaultTaxRate",
                    parseFloat(event.target.value) || 0
                  )
                }
                className={`${touchInput} mt-1.5`}
              />
            </div>

            <div>
              <label
                htmlFor="settings-defaultValidityDays"
                className="block text-base font-medium text-slate-300"
              >
                Default Quote Validity (days)
              </label>
              <input
                id="settings-defaultValidityDays"
                type="number"
                min="1"
                value={form.defaultValidityDays}
                onChange={(event) =>
                  updateNumberField(
                    "defaultValidityDays",
                    parseInt(event.target.value, 10) || 30
                  )
                }
                className={`${touchInput} mt-1.5`}
              />
            </div>
          </section>

          <section>
            <QuoteTemplatePicker
              value={form.quoteTemplate}
              onChange={(quoteTemplate: QuoteTemplateId) => {
                setForm((current) => ({ ...current, quoteTemplate }));
                setSuccess(false);
              }}
              disabled={isSaving}
            />
          </section>

          {success && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-base text-green-400">
              Profile updated!
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className={`${touchBtnPrimary} w-full`}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
