import { getAppBaseUrl, getBaseUrlFromRequest, isSafePublicUrl, isUuid } from "@/lib/app-url";
import { createAnonClient } from "@/lib/supabase/anon";
import { logSupabaseError } from "@/lib/supabase/errors";
import type {
  MaterialOrderLine,
  PublicMaterialOrder,
} from "@/types/material-order";

export interface ConfirmMaterialOrderResult {
  success: boolean;
  alreadyConfirmed?: boolean;
  confirmedAt?: string | null;
  availabilityDate?: string | null;
  availabilityTime?: string | null;
  branchLocation?: string | null;
  orderId?: string;
  projectId?: string | null;
  customerId?: string | null;
  userId?: string;
  supplierName?: string;
  projectName?: string | null;
  contractorEmail?: string | null;
  supplierInvoiceId?: string | null;
  error?: string;
}

export function buildMaterialOrderConfirmUrl(
  token: string,
  baseUrl: string = getAppBaseUrl()
): string {
  if (!isUuid(token)) {
    throw new Error("Invalid material order confirmation token.");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/order-confirm/${token}`;

  if (!isSafePublicUrl(url) && !baseUrl.includes("localhost")) {
    throw new Error("Invalid material order confirmation URL base.");
  }

  return url;
}

export function buildMaterialOrderConfirmUrlFromRequest(
  token: string,
  request: Request
): string {
  return buildMaterialOrderConfirmUrl(token, getBaseUrlFromRequest(request));
}

function mapPublicOrder(row: Record<string, unknown>): PublicMaterialOrder {
  const materials = Array.isArray(row.materials)
    ? (row.materials as MaterialOrderLine[])
    : [];

  return {
    id: String(row.id),
    project_id: (row.project_id as string | null) ?? null,
    customer_id: (row.customer_id as string | null) ?? null,
    project_name: (row.project_name as string | null) ?? null,
    customer_name: (row.customer_name as string | null) ?? null,
    supplier_name: (row.supplier_name as string | null) ?? null,
    supplier_email: (row.supplier_email as string | null) ?? null,
    materials,
    notes: (row.notes as string | null) ?? null,
    required_by_date: (row.required_by_date as string | null) ?? null,
    delivery_option: (row.delivery_option as string | null) ?? null,
    project_reference: (row.project_reference as string | null) ?? null,
    status: row.status === "confirmed" ? "confirmed" : "sent",
    confirmed_at: (row.confirmed_at as string | null) ?? null,
    availability_date: (row.availability_date as string | null) ?? null,
    availability_time: (row.availability_time as string | null) ?? null,
    branch_location: (row.branch_location as string | null) ?? null,
    company_name:
      (row.company_name as string | null)?.trim() || "Your Contractor",
  };
}

export async function getPublicMaterialOrderByToken(
  token: string
): Promise<PublicMaterialOrder | null> {
  const normalized = token.trim();
  if (!isUuid(normalized)) {
    return null;
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc(
    "get_public_material_order_by_token",
    { p_token: normalized }
  );

  if (error) {
    logSupabaseError("getPublicMaterialOrderByToken.rpc", error, {
      token: normalized,
    });

    if (
      error.code === "42883" ||
      error.message.includes("get_public_material_order_by_token")
    ) {
      throw new Error(
        "Material order confirmation is not configured. Run migration 020_material_orders.sql."
      );
    }

    throw new Error(
      `Failed to load material order. | ${error.message} | code=${error.code ?? "unknown"}`
    );
  }

  if (!data) return null;
  return mapPublicOrder(data as Record<string, unknown>);
}

export async function confirmMaterialOrderByToken(input: {
  token: string;
  availabilityDate: string;
  availabilityTime: string;
  branchLocation: string;
}): Promise<ConfirmMaterialOrderResult> {
  const normalized = input.token.trim();
  if (!isUuid(normalized)) {
    return { success: false, error: "invalid_token" };
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc(
    "confirm_material_order_by_token",
    {
      p_token: normalized,
      p_availability_date: input.availabilityDate,
      p_availability_time: input.availabilityTime.trim(),
      p_branch_location: input.branchLocation.trim(),
    }
  );

  if (error) {
    logSupabaseError("confirmMaterialOrderByToken.rpc", error, {
      token: normalized,
    });

    if (
      error.code === "42883" ||
      error.message.includes("confirm_material_order_by_token")
    ) {
      throw new Error(
        "Material order confirmation is not configured. Run migration 020_material_orders.sql."
      );
    }

    throw new Error(
      `Failed to confirm material order. | ${error.message} | code=${error.code ?? "unknown"}`
    );
  }

  const result = (data ?? {}) as {
    success?: boolean;
    already_confirmed?: boolean;
    confirmed_at?: string | null;
    availability_date?: string | null;
    availability_time?: string | null;
    branch_location?: string | null;
    order_id?: string;
    project_id?: string | null;
    customer_id?: string | null;
    user_id?: string;
    supplier_name?: string;
    project_name?: string | null;
    contractor_email?: string | null;
    supplier_invoice_id?: string | null;
    error?: string;
  };

  if (result.error) {
    return { success: false, error: result.error };
  }

  if (!result.success) {
    return { success: false, error: "confirm_failed" };
  }

  return {
    success: true,
    alreadyConfirmed: Boolean(result.already_confirmed),
    confirmedAt: result.confirmed_at ?? null,
    availabilityDate: result.availability_date ?? null,
    availabilityTime: result.availability_time ?? null,
    branchLocation: result.branch_location ?? null,
    orderId: result.order_id,
    projectId: result.project_id ?? null,
    customerId: result.customer_id ?? null,
    userId: result.user_id,
    supplierName: result.supplier_name,
    projectName: result.project_name ?? null,
    contractorEmail: result.contractor_email ?? null,
    supplierInvoiceId: result.supplier_invoice_id ?? null,
  };
}
