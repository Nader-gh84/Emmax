import type { SupabaseClient } from "@supabase/supabase-js";

export async function isOnboardingComplete(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("business_profiles lookup failed:", error.message);
    return false;
  }

  return Boolean(data?.onboarding_completed);
}
