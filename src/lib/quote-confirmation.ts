import { getAppBaseUrl } from "@/lib/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Quote,
  StoredMaterial,
  formatCurrency,
  storedToMaterials,
} from "@/types/quote";

export interface PublicQuoteSummary {
  id: string;
  status: Quote["status"];
  project_name: string | null;
  customer_name: string | null;
  materials: StoredMaterial[];
  tax_rate: number;
  grand_total: number;
  confirmed_at: string | null;
  company_name: string;
}

export async function getQuoteByConfirmationToken(
  token: string
): Promise<PublicQuoteSummary | null> {
  const admin = createAdminClient();

  const { data: quote, error } = await admin
    .from("quotes")
    .select("*")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (error || !quote) {
    return null;
  }

  const { data: profile } = await admin
    .from("business_profiles")
    .select("company_name")
    .eq("user_id", quote.user_id)
    .maybeSingle();

  return {
    id: quote.id,
    status: quote.status as Quote["status"],
    project_name: quote.project_name,
    customer_name: quote.customer_name,
    materials: (quote.materials as StoredMaterial[]) ?? [],
    tax_rate: Number(quote.tax_rate),
    grand_total: Number(quote.grand_total),
    confirmed_at: quote.confirmed_at,
    company_name: profile?.company_name?.trim() || "Your Contractor",
  };
}

export async function getQuoteConfirmationToken(
  quoteId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("quotes")
    .select("confirmation_token")
    .eq("id", quoteId)
    .maybeSingle();

  return data?.confirmation_token ?? null;
}

export function buildQuoteDashboardUrl(quoteId: string): string {
  return `${getAppBaseUrl()}/dashboard/quotes?quote=${quoteId}`;
}

export function buildQuoteAcceptUrl(confirmationToken: string): string {
  return `${getAppBaseUrl()}/quote/confirm/${confirmationToken}`;
}

export function formatPublicQuoteMaterials(materials: StoredMaterial[]) {
  return storedToMaterials(materials);
}

export function formatPublicGrandTotal(total: number): string {
  return formatCurrency(total);
}
