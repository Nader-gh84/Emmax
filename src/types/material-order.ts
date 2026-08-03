export type MaterialOrderStatus = "sent" | "confirmed";

export interface MaterialOrderLine {
  id?: string;
  name: string;
  partNumber?: string;
  brand?: string;
  supplier?: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  status?: string;
}

export interface MaterialOrder {
  id: string;
  user_id: string;
  project_id: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  project_name: string;
  customer_name: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  materials: MaterialOrderLine[];
  notes: string | null;
  required_by_date: string | null;
  delivery_option: string | null;
  project_reference: string | null;
  status: MaterialOrderStatus;
  confirmation_token: string;
  sent_at: string;
  confirmed_at: string | null;
  availability_date: string | null;
  availability_time: string | null;
  branch_location: string | null;
  materials_received_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicMaterialOrder {
  id: string;
  project_id: string | null;
  customer_id: string | null;
  project_name: string | null;
  customer_name: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  materials: MaterialOrderLine[];
  notes: string | null;
  required_by_date: string | null;
  delivery_option: string | null;
  project_reference: string | null;
  status: MaterialOrderStatus;
  confirmed_at: string | null;
  availability_date: string | null;
  availability_time: string | null;
  branch_location: string | null;
  company_name: string;
}

export type MaterialsTrackerStep =
  | "quote_accepted"
  | "review_materials"
  | "order_sent"
  | "materials_ready"
  | "project_start";

export function getMaterialsTrackerActiveStep(
  order: Pick<MaterialOrder, "status"> | null | undefined
): MaterialsTrackerStep {
  if (!order) return "review_materials";
  if (order.status === "confirmed") return "materials_ready";
  if (order.status === "sent") return "order_sent";
  return "review_materials";
}

export function formatAvailabilityLabel(
  date: string | null | undefined,
  time: string | null | undefined
): string {
  if (!date && !time) return "—";
  const dateLabel = date
    ? new Date(
        date.includes("T") ? date : `${date}T00:00:00`
      ).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  const timeLabel = time?.trim() || "";
  if (dateLabel && timeLabel) return `${dateLabel} at ${timeLabel}`;
  return dateLabel || timeLabel || "—";
}
