"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepProfile } from "@/components/onboarding/step-profile";
import { StepQuoteDefaults } from "@/components/onboarding/step-quote-defaults";
import type { ProfileData } from "@/types/onboarding";

async function saveProfile(payload: Record<string, unknown>) {
  const response = await fetch("/api/onboarding/save-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to save profile");
  }
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  async function handleProfileComplete(nextProfile: ProfileData) {
    await saveProfile({
      step: "profile",
      ...nextProfile,
    });
    setProfile(nextProfile);
    setStep(2);
  }

  async function handleDefaultsComplete(defaults: {
    defaultTaxRate: number;
    defaultValidityDays: number;
  }) {
    await saveProfile({
      step: "defaults",
      defaultTaxRate: defaults.defaultTaxRate,
      defaultValidityDays: defaults.defaultValidityDays,
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-navy text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12)_0%,_transparent_60%)]" />

      <div className="relative mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Step {step} of 2
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {step === 1 ? "Profile setup" : "Quote defaults"}
          </h1>
        </div>

        {step === 1 ? (
          <StepProfile onComplete={handleProfileComplete} />
        ) : (
          <StepQuoteDefaults onComplete={handleDefaultsComplete} />
        )}
      </div>
    </div>
  );
}
