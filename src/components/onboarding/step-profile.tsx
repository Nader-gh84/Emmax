"use client";

import { useState } from "react";
import { ProfileFormFields } from "@/components/profile/profile-form-fields";
import { touchBtnPrimary } from "@/components/quotes/ui";
import { formatPhoneForStorage } from "@/lib/location";
import {
  EMPTY_PROFILE,
  PROFILE_FIELDS,
  type ProfileData,
  type ProfileFieldKey,
} from "@/types/onboarding";

interface StepProfileProps {
  onComplete: (profile: ProfileData) => void | Promise<void>;
}

export function StepProfile({ onComplete }: StepProfileProps) {
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(key: ProfileFieldKey, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function handleCountryChange(country: string) {
    setProfile((current) => ({
      ...current,
      country,
      city: current.country === country ? current.city : "",
    }));
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
      const phone = formatPhoneForStorage(profile.country, phoneLocal);

      await onComplete({
        ...profile,
        fullName: profile.fullName.trim(),
        companyName: profile.companyName.trim(),
        trade: profile.trade.trim(),
        country: profile.country.trim(),
        city: profile.city.trim(),
        email: profile.email.trim(),
        phone,
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
        <ProfileFormFields
          profile={profile}
          phoneLocal={phoneLocal}
          idPrefix="profile"
          onFieldChange={updateField}
          onPhoneLocalChange={setPhoneLocal}
          onCountryChange={handleCountryChange}
        />

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
