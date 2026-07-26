"use client";

import { useState } from "react";
import { touchBtnPrimary, touchInput } from "@/components/quotes/ui";
import {
  EMPTY_PROFILE,
  PROFILE_FIELDS,
  TRADE_OPTIONS,
  type ProfileData,
  type ProfileFieldKey,
} from "@/types/onboarding";

interface StepProfileProps {
  onComplete: (profile: ProfileData) => void | Promise<void>;
}

export function StepProfile({ onComplete }: StepProfileProps) {
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(key: ProfileFieldKey, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const missingRequired = PROFILE_FIELDS.filter(
      (field) => !field.optional && !profile[field.key]?.trim()
    );

    if (missingRequired.length > 0) {
      setError("Please fill in all required fields before continuing.");
      return;
    }

    setIsSaving(true);

    try {
      await onComplete({
        ...profile,
        fullName: profile.fullName.trim(),
        companyName: profile.companyName.trim(),
        trade: profile.trade.trim(),
        city: profile.city.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">
        Set up your profile
      </h2>
      <p className="mt-2 text-center text-base text-slate-400">
        Enter your business details so Ema can personalize your quotes.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {PROFILE_FIELDS.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`profile-${field.key}`}
              className="block text-base font-medium text-slate-300"
            >
              {field.label}
              {!field.optional && <span className="text-accent"> *</span>}
            </label>

            {field.key === "trade" ? (
              <select
                id={`profile-${field.key}`}
                value={profile.trade}
                onChange={(event) => updateField("trade", event.target.value)}
                className={`${touchInput} mt-1.5 appearance-none`}
                required
              >
                <option value="" disabled>
                  Select your trade
                </option>
                {TRADE_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-navy text-white">
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`profile-${field.key}`}
                type={
                  field.key === "email"
                    ? "email"
                    : field.key === "phone"
                      ? "tel"
                      : "text"
                }
                value={profile[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
                className={`${touchInput} mt-1.5`}
                placeholder={field.optional ? "Optional" : field.label}
                required={!field.optional}
                autoComplete={
                  field.key === "fullName"
                    ? "name"
                    : field.key === "email"
                      ? "email"
                      : field.key === "phone"
                        ? "tel"
                        : field.key === "city"
                          ? "address-level2"
                          : field.key === "companyName"
                            ? "organization"
                            : undefined
                }
              />
            )}
          </div>
        ))}

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
          {isSaving ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
