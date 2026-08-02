import type { Metadata } from "next";
import { OrderMaterialsPage } from "@/components/projects/order-materials-page";
import {
  getMockOrderMaterials,
  type OrderMaterialRow,
  type OrderSupplierOption,
} from "@/lib/order-materials-mock";
import { createClient } from "@/lib/supabase/server";
import type { MaterialOrder, MaterialOrderLine } from "@/types/material-order";

export const metadata: Metadata = {
  title: "Order Materials",
};

function mapOrderMaterials(lines: MaterialOrderLine[]): OrderMaterialRow[] {
  return lines.map((line, index) => ({
    id: line.id || `line-${index}`,
    name: line.name,
    partNumber: line.partNumber || "",
    brand: line.brand || "",
    supplier: line.supplier || "",
    quantity: Number(line.quantity) || 0,
    unit: line.unit || "ea",
    unitPrice: Number(line.unitPrice) || 0,
    status: (line.status as OrderMaterialRow["status"]) || "In Quote",
  }));
}

export default async function OrderMaterialsRoute({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  const mock = getMockOrderMaterials(params.id, params.projectId);
  const supabase = createClient();

  const [{ data: suppliersData }, { data: orderData }, { data: projectData }] =
    await Promise.all([
      supabase
        .from("suppliers")
        .select("id, supplier_name, email")
        .order("supplier_name", { ascending: true }),
      supabase
        .from("material_orders")
        .select("*")
        .eq("project_id", params.projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("projects")
        .select("id, project_name, customer_id, value")
        .eq("id", params.projectId)
        .maybeSingle(),
    ]);

  const suppliers: OrderSupplierOption[] = (suppliersData ?? []).map((row) => ({
    id: row.id as string,
    name: (row.supplier_name as string) || "Supplier",
    email: (row.email as string | null) ?? null,
  }));

  const existingOrder = (orderData as MaterialOrder | null) ?? null;

  const order = {
    ...mock,
    customerId: params.id,
    projectId: params.projectId,
    projectName:
      projectData?.project_name?.trim() ||
      existingOrder?.project_name?.trim() ||
      mock.projectName,
    customerName:
      existingOrder?.customer_name?.trim() || mock.customerName,
    quoteAmount: Number(projectData?.value) || mock.quoteAmount,
    suppliers,
    primarySupplierId:
      existingOrder?.supplier_id ||
      suppliers[0]?.id ||
      "",
    notes: existingOrder?.notes ?? mock.notes,
    requiredByDate:
      existingOrder?.required_by_date ?? mock.requiredByDate,
    deliveryOption:
      existingOrder?.delivery_option ?? mock.deliveryOption,
    projectReference:
      existingOrder?.project_reference ?? mock.projectReference,
    materials: existingOrder?.materials?.length
      ? mapOrderMaterials(existingOrder.materials)
      : mock.materials,
  };

  return (
    <OrderMaterialsPage order={order} existingOrder={existingOrder} />
  );
}
