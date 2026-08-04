import type { Metadata } from "next";
import Link from "next/link";
import { ProjectDetailPage } from "@/components/projects/project-detail-page";
import { buildProjectDetailViewModel } from "@/lib/project-detail-mock";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDisplayName, type Customer } from "@/types/customer";
import type { MaterialOrder } from "@/types/material-order";
import {
  asProjectLabour,
  asProjectMaterials,
  isProjectStatus,
  resolveProjectDisplayName,
  type Project,
} from "@/types/project";
import type { Quote } from "@/types/quote";

export const metadata: Metadata = {
  title: "Project Details",
};

type ProjectRow = Project & {
  quotes?: Pick<
    Quote,
    | "project_name"
    | "quote_number"
    | "notes"
    | "confirmed_at"
    | "created_at"
    | "status"
    | "grand_total"
  > | null;
};

export default async function ProjectDetailRoute({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  const customerIdParam = params.id?.trim() ?? "";
  const projectId = params.projectId?.trim() ?? "";
  const supabase = createClient();

  const [{ data: projectData }, { data: orderRow }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "*, quotes(project_name, quote_number, notes, confirmed_at, created_at, status, grand_total)"
      )
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("material_orders")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
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

  const linkedQuote = projectRow.quotes ?? null;
  const projectName = resolveProjectDisplayName(
    projectRow.project_name,
    linkedQuote
  );
  const status =
    typeof projectRow.status === "string" && isProjectStatus(projectRow.status)
      ? projectRow.status
      : "active";
  const startDateConfirmed = Boolean(projectRow.start_date_confirmed);
  const materialOrder = (orderRow as MaterialOrder | null) ?? null;

  const labourItems = asProjectLabour(projectRow.labour_items);
  const projectMaterials = asProjectMaterials(projectRow.materials);
  const materialLineCount =
    materialOrder?.materials?.length || projectMaterials.length;

  const customerName = customerRow
    ? getCustomerDisplayName(customerRow)
    : "Customer";

  const description =
    projectRow.notes?.trim() || linkedQuote?.notes?.trim() || "";

  const project = buildProjectDetailViewModel({
    id: projectRow.id,
    customerId: customerId || customerIdParam,
    projectName,
    customerName,
    customerPhone: customerRow?.phone ?? null,
    address: customerRow?.address ?? null,
    quoteAmount:
      Number(projectRow.value) || Number(linkedQuote?.grand_total) || 0,
    status,
    startDateConfirmed,
    startDate: projectRow.start_date,
    description,
    scopeItems: labourItems
      .map((item) => item.description?.trim() || "")
      .filter(Boolean),
    acceptedAt:
      linkedQuote?.confirmed_at ||
      linkedQuote?.created_at ||
      projectRow.created_at,
    quoteNumber: linkedQuote?.quote_number ?? null,
    materialLineCount,
    materialsReceived: Boolean(materialOrder?.materials_received_at),
    materialsOrdered: Boolean(materialOrder),
  });

  return (
    <ProjectDetailPage
      project={project}
      materialOrder={materialOrder}
      projectStatus={status}
      startDateConfirmed={startDateConfirmed}
      rawStartDate={
        startDateConfirmed && projectRow.start_date
          ? String(projectRow.start_date)
          : null
      }
    />
  );
}
