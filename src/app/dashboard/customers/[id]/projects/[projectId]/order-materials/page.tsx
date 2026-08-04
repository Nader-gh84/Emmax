import type { Metadata } from "next";
import Link from "next/link";
import { OrderMaterialsPage } from "@/components/projects/order-materials-page";
import {
  buildOrderMaterialsViewModel,
  type OrderMaterialRow,
  type OrderSupplierOption,
} from "@/lib/order-materials-mock";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDisplayName, type Customer } from "@/types/customer";
import type { MaterialOrder, MaterialOrderLine } from "@/types/material-order";
import {
  asProjectMaterials,
  formatProjectDate,
  resolveProjectDisplayName,
  type Project,
} from "@/types/project";
import type { Quote, StoredMaterial } from "@/types/quote";

export const metadata: Metadata = {
  title: "Order Materials",
};

type ProjectRow = Project & {
  quotes?: Pick<
    Quote,
    "project_name" | "quote_number" | "confirmed_at" | "created_at" | "grand_total"
  > | null;
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

function mapStoredMaterials(materials: StoredMaterial[]): OrderMaterialRow[] {
  return materials.map((row, index) => ({
    id: `project-mat-${index}`,
    name: row.item,
    partNumber: "",
    brand: row.brand || "",
    supplier: "",
    quantity: Number(row.quantity) || 0,
    unit: row.unit || "ea",
    unitPrice: Number(row.unitPrice) || 0,
    status: "In Quote" as const,
  }));
}

export default async function OrderMaterialsRoute({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  const customerIdParam = params.id?.trim() ?? "";
  const projectId = params.projectId?.trim() ?? "";
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
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("projects")
        .select(
          "*, quotes(project_name, quote_number, confirmed_at, created_at, grand_total)"
        )
        .eq("id", projectId)
        .maybeSingle(),
    ]);

  const projectRow = projectData as ProjectRow | null;

  if (!projectRow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Project not found</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          This project may have been deleted, or the link is invalid.
        </p>
        <Link
          href={
            customerIdParam
              ? `/dashboard/customers/${customerIdParam}`
              : "/dashboard/customers"
          }
          className="mt-6 text-sm font-semibold text-accent hover:text-blue-400"
        >
          Back to Customer
        </Link>
      </div>
    );
  }

  if (
    customerIdParam &&
    projectRow.customer_id &&
    projectRow.customer_id !== customerIdParam
  ) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Project not found</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          This project does not belong to the selected customer.
        </p>
        <Link
          href={`/dashboard/customers/${customerIdParam}`}
          className="mt-6 text-sm font-semibold text-accent hover:text-blue-400"
        >
          Back to Customer
        </Link>
      </div>
    );
  }

  const customerId =
    (projectRow.customer_id?.trim() || customerIdParam).trim() ||
    customerIdParam;

  let customerRow: Customer | null = null;
  if (customerId) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();
    customerRow = (data as Customer | null) ?? null;
  }

  const suppliers: OrderSupplierOption[] = (suppliersData ?? []).map((row) => ({
    id: row.id as string,
    name: (row.supplier_name as string) || "Supplier",
    email: (row.email as string | null) ?? null,
  }));

  const existingOrder = (orderData as MaterialOrder | null) ?? null;
  const linkedQuote = projectRow.quotes ?? null;
  const projectName = resolveProjectDisplayName(
    projectRow.project_name,
    linkedQuote
  );
  const customerName = customerRow
    ? getCustomerDisplayName(customerRow)
    : existingOrder?.customer_name?.trim() || "Customer";

  const projectMaterials = mapStoredMaterials(
    asProjectMaterials(projectRow.materials)
  );

  const materials = existingOrder?.materials?.length
    ? mapOrderMaterials(existingOrder.materials)
    : projectMaterials;

  const acceptedAt =
    linkedQuote?.confirmed_at ||
    linkedQuote?.created_at ||
    projectRow.created_at;

  const order = buildOrderMaterialsViewModel({
    customerId: customerId || customerIdParam,
    projectId: projectRow.id,
    projectName:
      existingOrder?.project_name?.trim() || projectName,
    customerName,
    customerPhone: customerRow?.phone ?? null,
    address: customerRow?.address ?? null,
    acceptedDate: formatProjectDate(acceptedAt),
    quoteAmount:
      Number(projectRow.value) ||
      Number(linkedQuote?.grand_total) ||
      0,
    materials,
    notes: existingOrder?.notes ?? "",
    primarySupplierId:
      existingOrder?.supplier_id || suppliers[0]?.id || "",
    deliveryOption: existingOrder?.delivery_option ?? "Delivery to Site",
    requiredByDate: existingOrder?.required_by_date ?? "",
    projectReference:
      existingOrder?.project_reference ||
      `${projectName} — ${customerName}`,
    suppliers,
  });

  return (
    <OrderMaterialsPage order={order} existingOrder={existingOrder} />
  );
}
