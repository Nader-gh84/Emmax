import type { Metadata } from "next";
import { ProjectDetailPage } from "@/components/projects/project-detail-page";
import { getMockProjectDetail } from "@/lib/project-detail-mock";
import { createClient } from "@/lib/supabase/server";
import type { MaterialOrder } from "@/types/material-order";

export const metadata: Metadata = {
  title: "Project Details",
};

export default async function ProjectDetailRoute({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  // Shell still uses kitchen renovation mock for most fields.
  // Material order status is loaded live when migration 020 is applied.
  const project = getMockProjectDetail(params.id, params.projectId);
  const supabase = createClient();

  const [{ data: projectRow }, { data: orderRow }] = await Promise.all([
    supabase
      .from("projects")
      .select("project_name, value, customer_id")
      .eq("id", params.projectId)
      .maybeSingle(),
    supabase
      .from("material_orders")
      .select("*")
      .eq("project_id", params.projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (projectRow?.project_name?.trim()) {
    project.projectName = projectRow.project_name.trim();
  }
  if (projectRow?.value != null) {
    project.quoteAmount = Number(projectRow.value) || project.quoteAmount;
  }

  const materialOrder = (orderRow as MaterialOrder | null) ?? null;

  return (
    <ProjectDetailPage project={project} materialOrder={materialOrder} />
  );
}
