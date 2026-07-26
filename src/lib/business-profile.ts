import type { SupabaseClient } from "@supabase/supabase-js";

export async function hasBusinessProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("business_profiles lookup failed:", error.message);
    return false;
  }

  return Boolean(data);
}
