import { getAppBaseUrl, getBaseUrlFromRequest, isSafePublicUrl, isUuid } from "@/lib/app-url";
import { createAnonClient } from "@/lib/supabase/anon";
import { logSupabaseError } from "@/lib/supabase/errors";

export interface SupplierAckSummary {
  quoteId: string;
  projectName: string | null;
  companyName: string;
  supplierName: string;
  supplierEmail: string;
  acknowledgedAt: string | null;
}

export interface AcknowledgeSupplierResult {
  success: boolean;
  alreadyAcknowledged?: boolean;
  acknowledgedAt?: string | null;
  quoteId?: string;
  supplierName?: string;
  supplierEmail?: string;
  error?: string;
}

export function buildSupplierAckUrl(
  token: string,
  baseUrl: string = getAppBaseUrl()
): string {
  if (!isUuid(token)) {
    throw new Error("Invalid supplier acknowledgment token.");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/supplier-ack/${token}`;

  if (!isSafePublicUrl(url) && !baseUrl.includes("localhost")) {
    throw new Error("Invalid supplier acknowledgment URL base.");
  }

  return url;
}

export function buildSupplierAckUrlFromRequest(
  token: string,
  request: Request
): string {
  return buildSupplierAckUrl(token, getBaseUrlFromRequest(request));
}

export async function getSupplierAckByToken(
  token: string
): Promise<SupplierAckSummary | null> {
  const normalized = token.trim();
  if (!isUuid(normalized)) {
    return null;
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("get_supplier_ack_by_token", {
    p_token: normalized,
  });

  if (error) {
    logSupabaseError("getSupplierAckByToken.rpc", error, { token: normalized });

    if (
      error.code === "42883" ||
      error.message.includes("get_supplier_ack_by_token")
    ) {
      throw new Error(
        "Supplier acknowledgment is not configured. Run migration 015_supplier_acknowledgment.sql."
      );
    }

    throw new Error(
      `Failed to load supplier acknowledgment. | ${error.message} | code=${error.code ?? "unknown"}`
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return null;
  }

  return {
    quoteId: row.quote_id as string,
    projectName: (row.project_name as string | null) ?? null,
    companyName:
      (row.company_name as string | null)?.trim() || "Your Contractor",
    supplierName:
      (row.supplier_name as string | null)?.trim() || "Supplier",
    supplierEmail: (row.supplier_email as string | null)?.trim() || "",
    acknowledgedAt: (row.acknowledged_at as string | null) ?? null,
  };
}

/**
 * RPC-only acknowledge path. No admin fallback that can succeed without a notification.
 * Notification insert + acknowledged_at stamp happen atomically inside the SQL function.
 */
export async function acknowledgeSupplierRequest(
  token: string
): Promise<AcknowledgeSupplierResult> {
  const normalized = token.trim();
  if (!isUuid(normalized)) {
    return { success: false, error: "invalid_token" };
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("acknowledge_supplier_request", {
    p_token: normalized,
  });

  if (error) {
    logSupabaseError("acknowledgeSupplierRequest.rpc", error, {
      token: normalized,
    });

    if (
      error.code === "42883" ||
      error.message.includes("acknowledge_supplier_request")
    ) {
      throw new Error(
        "Supplier acknowledgment is not configured. Run migration 015_supplier_acknowledgment.sql."
      );
    }

    throw new Error(
      `Failed to acknowledge supplier request. | ${error.message} | code=${error.code ?? "unknown"}`
    );
  }

  const result = (data ?? {}) as {
    success?: boolean;
    already_acknowledged?: boolean;
    acknowledged_at?: string | null;
    quote_id?: string;
    supplier_name?: string;
    supplier_email?: string;
    error?: string;
  };

  if (result.error) {
    return { success: false, error: result.error };
  }

  if (!result.success) {
    return { success: false, error: "acknowledge_failed" };
  }

  return {
    success: true,
    alreadyAcknowledged: Boolean(result.already_acknowledged),
    acknowledgedAt: result.acknowledged_at ?? null,
    quoteId: result.quote_id,
    supplierName: result.supplier_name,
    supplierEmail: result.supplier_email,
  };
}
