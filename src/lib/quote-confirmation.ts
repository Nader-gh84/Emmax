import { getAppBaseUrl, isSafePublicUrl, isUuid } from "@/lib/app-url";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createAnonClient } from "@/lib/supabase/anon";
import { logSupabaseError } from "@/lib/supabase/errors";
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

interface PublicQuoteRow {
  id: string;
  status: string;
  project_name: string | null;
  customer_name: string | null;
  materials: StoredMaterial[] | null;
  tax_rate: number;
  grand_total: number;
  confirmed_at: string | null;
  company_name: string | null;
}

function mapPublicQuoteRow(row: PublicQuoteRow): PublicQuoteSummary {
  return {
    id: row.id,
    status: row.status as Quote["status"],
    project_name: row.project_name,
    customer_name: row.customer_name,
    materials: row.materials ?? [],
    tax_rate: Number(row.tax_rate),
    grand_total: Number(row.grand_total),
    confirmed_at: row.confirmed_at,
    company_name: row.company_name?.trim() || "Your Contractor",
  };
}

async function getQuoteByConfirmationTokenAdmin(
  token: string
): Promise<PublicQuoteSummary | null> {
  const admin = createAdminClient();

  const { data: quote, error } = await admin
    .from("quotes")
    .select("*")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (error) {
    logSupabaseError("getQuoteByConfirmationToken.admin.select", error, {
      token,
    });
    throw new Error(
      `Failed to load quote by confirmation token. | ${error.message} | code=${error.code ?? "unknown"}`
    );
  }

  if (!quote) {
    return null;
  }

  const { data: profile, error: profileError } = await admin
    .from("business_profiles")
    .select("company_name")
    .eq("user_id", quote.user_id)
    .maybeSingle();

  if (profileError) {
    logSupabaseError("getQuoteByConfirmationToken.admin.profile", profileError, {
      token,
      quoteId: quote.id,
    });
  }

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

async function getQuoteByConfirmationTokenRpc(
  token: string
): Promise<PublicQuoteSummary | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase.rpc(
    "get_public_quote_by_confirmation_token",
    { p_token: token }
  );

  if (error) {
    logSupabaseError("getQuoteByConfirmationToken.rpc", error, { token });

    if (
      error.code === "42883" ||
      error.message.includes("get_public_quote_by_confirmation_token")
    ) {
      throw new Error(
        "Quote confirmation lookup is not configured. Run migration 011_public_quote_confirm_rpc.sql or set SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    throw new Error(
      `Failed to load quote by confirmation token. | ${error.message} | code=${error.code ?? "unknown"}`
    );
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return null;
  }

  return mapPublicQuoteRow(row as PublicQuoteRow);
}

export async function getQuoteByConfirmationToken(
  token: string
): Promise<PublicQuoteSummary | null> {
  const normalizedToken = token.trim();

  if (!isUuid(normalizedToken)) {
    console.error("[getQuoteByConfirmationToken] Invalid token format:", {
      token: normalizedToken,
    });
    return null;
  }

  if (isAdminClientConfigured()) {
    return getQuoteByConfirmationTokenAdmin(normalizedToken);
  }

  console.warn(
    "[getQuoteByConfirmationToken] SUPABASE_SERVICE_ROLE_KEY not set; using public RPC fallback."
  );

  return getQuoteByConfirmationTokenRpc(normalizedToken);
}

export async function getQuoteConfirmationToken(
  quoteId: string
): Promise<string | null> {
  if (!isAdminClientConfigured()) {
    console.error(
      "[getQuoteConfirmationToken] Admin client not configured for quoteId lookup."
    );
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quotes")
    .select("confirmation_token")
    .eq("id", quoteId)
    .maybeSingle();

  if (error) {
    logSupabaseError("getQuoteConfirmationToken", error, { quoteId });
    return null;
  }

  return data?.confirmation_token ?? null;
}

export function buildQuoteDashboardUrl(quoteId: string): string {
  return `${getAppBaseUrl()}/dashboard/quotes?quote=${quoteId}`;
}

export function buildQuoteAcceptUrl(
  confirmationToken: string,
  baseUrl: string = getAppBaseUrl()
): string {
  if (!isUuid(confirmationToken)) {
    throw new Error("Invalid confirmation token.");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/quote/confirm/${confirmationToken}`;

  if (!isSafePublicUrl(url) && !baseUrl.includes("localhost")) {
    throw new Error("Invalid confirmation URL base.");
  }

  return url;
}

export function formatPublicQuoteMaterials(materials: StoredMaterial[]) {
  return storedToMaterials(materials);
}

export function formatPublicGrandTotal(total: number): string {
  return formatCurrency(total);
}

export interface ConfirmQuoteRpcResult {
  success?: boolean;
  already_accepted?: boolean;
  confirmed_at?: string | null;
  quote_id?: string;
  user_id?: string;
  customer_name?: string | null;
  project_name?: string | null;
  grand_total?: number;
  contractor_email?: string | null;
  error?: string;
}

export async function confirmQuoteByConfirmationToken(
  token: string
): Promise<ConfirmQuoteRpcResult> {
  const normalizedToken = token.trim();

  if (!isUuid(normalizedToken)) {
    return { error: "invalid_token" };
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("confirm_quote_by_confirmation_token", {
    p_token: normalizedToken,
  });

  if (error) {
    logSupabaseError("confirmQuoteByConfirmationToken.rpc", error, {
      token: normalizedToken,
    });

    if (
      error.code === "42883" ||
      error.message.includes("confirm_quote_by_confirmation_token")
    ) {
      throw new Error(
        "Quote confirmation is not configured. Run migration 011_public_quote_confirm_rpc.sql or set SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    throw new Error(
      `Failed to confirm quote. | ${error.message} | code=${error.code ?? "unknown"}`
    );
  }

  return (data ?? {}) as ConfirmQuoteRpcResult;
}
