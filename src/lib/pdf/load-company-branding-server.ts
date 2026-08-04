import { createClient } from "@/lib/supabase/server";
import {
  brandingFromProfileRow,
  EMPTY_COMPANY_BRANDING,
  type CompanyBrandingForPdf,
} from "@/lib/pdf/quote-pdf-shared";

/** Server-side branding load for API routes (send-quote, etc.). */
export async function loadCompanyBrandingForPdfServer(): Promise<CompanyBrandingForPdf> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ...EMPTY_COMPANY_BRANDING };

  const { data, error } = await supabase
    .from("business_profiles")
    .select(
      "company_name, tagline, full_name, email, phone, website, address, city, country, quote_template"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[loadCompanyBrandingForPdfServer]", error.message);
    return { ...EMPTY_COMPANY_BRANDING };
  }

  return brandingFromProfileRow(data as Record<string, unknown> | null);
}
