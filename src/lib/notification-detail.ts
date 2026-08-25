import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MaterialOrder,
  MaterialOrderLine,
} from "@/types/material-order";
import type { AppNotification } from "@/types/notification";
import type { Quote, StoredMaterial } from "@/types/quote";

export type NotificationModalKind =
  | "quote"
  | "material"
  | "draft"
  | "employee_clock"
  | "generic";

export type MaterialSummaryStatus =
  | "sent"
  | "awaiting_pricing"
  | "preparing_pricing"
  | "confirmed";

export interface MaterialSummaryView {
  supplierName: string;
  supplierEmail: string;
  projectName: string;
  materials: MaterialOrderLine[];
  status: MaterialSummaryStatus;
  statusLabel: string;
  availabilityDate: string | null;
  availabilityTime: string | null;
  branchLocation: string | null;
  confirmedAt: string | null;
  source: "material_order" | "quote";
}

export function getNotificationModalKind(
  notification: AppNotification
): NotificationModalKind {
  switch (notification.type) {
    case "quote_accepted":
    case "quote_declined":
      return "quote";
    case "supplier_price":
    case "materials_confirmed":
      return "material";
    case "draft_quote":
      return "draft";
    case "employee_clock":
      return "employee_clock";
    default:
      return "generic";
  }
}

function storedMaterialsToLines(
  materials: StoredMaterial[] | null | undefined
): MaterialOrderLine[] {
  if (!Array.isArray(materials)) return [];
  return materials.map((row, index) => ({
    id: `line-${index}`,
    name: row.item?.trim() || "Material",
    brand: row.brand?.trim() || undefined,
    quantity: Number(row.quantity) || 0,
    unit: row.unit?.trim() || "each",
  }));
}

function normalizeOrderMaterials(
  materials: MaterialOrder["materials"] | null | undefined
): MaterialOrderLine[] {
  if (!Array.isArray(materials)) return [];
  return materials.map((row, index) => ({
    id: row.id || `line-${index}`,
    name: row.name?.trim() || "Material",
    brand: row.brand?.trim() || undefined,
    partNumber: row.partNumber,
    quantity: Number(row.quantity) || 0,
    unit: row.unit?.trim() || "each",
    unitCost: row.unitCost,
    status: row.status,
  }));
}

function materialSummaryFromOrder(
  order: MaterialOrder
): MaterialSummaryView {
  const confirmed = order.status === "confirmed";
  return {
    supplierName: order.supplier_name?.trim() || "Supplier",
    supplierEmail: order.supplier_email?.trim() || "",
    projectName: order.project_name?.trim() || "Untitled project",
    materials: normalizeOrderMaterials(order.materials),
    status: confirmed ? "confirmed" : "sent",
    statusLabel: confirmed ? "Confirmed" : "Order sent",
    availabilityDate: order.availability_date,
    availabilityTime: order.availability_time,
    branchLocation: order.branch_location,
    confirmedAt: order.confirmed_at,
    source: "material_order",
  };
}

type QuoteMaterialsSource = {
  project_name?: string | null;
  materials?: StoredMaterial[] | null;
  supplier_ack_supplier_name?: string | null;
  supplier_ack_supplier_email?: string | null;
  supplier_acknowledged_at?: string | null;
};

function materialSummaryFromQuote(
  quote: QuoteMaterialsSource,
  notification: AppNotification
): MaterialSummaryView {
  const meta = notification.metadata ?? {};
  const supplierName =
    (typeof meta.supplier_name === "string" && meta.supplier_name.trim()) ||
    quote.supplier_ack_supplier_name?.trim() ||
    "Supplier";
  const supplierEmail =
    (typeof meta.supplier_email === "string" && meta.supplier_email.trim()) ||
    quote.supplier_ack_supplier_email?.trim() ||
    "";

  const preparing =
    Boolean(quote.supplier_acknowledged_at) ||
    notification.message.toLowerCase().includes("received your materials");

  return {
    supplierName,
    supplierEmail,
    projectName: quote.project_name?.trim() || "Untitled project",
    materials: storedMaterialsToLines(quote.materials),
    status: preparing ? "preparing_pricing" : "awaiting_pricing",
    statusLabel: preparing
      ? "Preparing pricing"
      : "Sent — awaiting pricing",
    availabilityDate: null,
    availabilityTime: null,
    branchLocation: null,
    confirmedAt: null,
    source: "quote",
  };
}

export async function loadQuoteForNotification(
  supabase: SupabaseClient,
  notification: AppNotification
): Promise<Quote | null> {
  if (!notification.quote_id) return null;
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", notification.quote_id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Quote;
}

export async function loadMaterialSummaryForNotification(
  supabase: SupabaseClient,
  notification: AppNotification
): Promise<MaterialSummaryView | null> {
  const meta = notification.metadata ?? {};
  const materialOrderId =
    typeof meta.material_order_id === "string" && meta.material_order_id
      ? meta.material_order_id
      : null;

  if (materialOrderId) {
    const { data, error } = await supabase
      .from("material_orders")
      .select("*")
      .eq("id", materialOrderId)
      .maybeSingle();
    if (!error && data) {
      return materialSummaryFromOrder(data as MaterialOrder);
    }
  }

  // supplier_price notifications are keyed by quote_id (materials live on quotes).
  if (notification.quote_id) {
    const { data, error } = await supabase
      .from("quotes")
      .select(
        "id, project_name, materials, supplier_ack_supplier_name, supplier_ack_supplier_email, supplier_acknowledged_at"
      )
      .eq("id", notification.quote_id)
      .maybeSingle();
    if (!error && data) {
      return materialSummaryFromQuote(
        data as QuoteMaterialsSource,
        notification
      );
    }
  }

  // Last resort: metadata-only view for materials_confirmed if order row missing.
  if (notification.type === "materials_confirmed") {
    return {
      supplierName:
        typeof meta.supplier_name === "string" && meta.supplier_name.trim()
          ? meta.supplier_name
          : "Supplier",
      supplierEmail:
        typeof meta.supplier_email === "string" ? meta.supplier_email : "",
      projectName:
        typeof meta.project_name === "string" && meta.project_name.trim()
          ? meta.project_name
          : "Untitled project",
      materials: [],
      status: "confirmed",
      statusLabel: "Confirmed",
      availabilityDate:
        typeof meta.availability_date === "string"
          ? meta.availability_date
          : null,
      availabilityTime:
        typeof meta.availability_time === "string"
          ? meta.availability_time
          : null,
      branchLocation:
        typeof meta.branch_location === "string" ? meta.branch_location : null,
      confirmedAt: null,
      source: "material_order",
    };
  }

  if (notification.type === "supplier_price") {
    return {
      supplierName:
        typeof meta.supplier_name === "string" && meta.supplier_name.trim()
          ? meta.supplier_name
          : "Supplier",
      supplierEmail:
        typeof meta.supplier_email === "string" ? meta.supplier_email : "",
      projectName: "Materials list",
      materials: [],
      status: notification.message.toLowerCase().includes("received")
        ? "preparing_pricing"
        : "awaiting_pricing",
      statusLabel: notification.message.toLowerCase().includes("received")
        ? "Preparing pricing"
        : "Sent — awaiting pricing",
      availabilityDate: null,
      availabilityTime: null,
      branchLocation: null,
      confirmedAt: null,
      source: "quote",
    };
  }

  return null;
}
