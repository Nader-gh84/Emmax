import type { Metadata } from "next";
import { ProjectDetailPage } from "@/components/projects/project-detail-page";
import { getMockProjectDetail } from "@/lib/project-detail-mock";
import { createClient } from "@/lib/supabase/server";
import type { MaterialOrder } from "@/types/material-order";
import { formatProjectDate, isProjectStatus } from "@/types/project";

export const metadata: Metadata = {
  title: "Project Details",
};

export default async function ProjectDetailRoute({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  // Shell still uses kitchen renovation mock for most fields.
  // Start-date / materials / start-project state are loaded live.
  const project = getMockProjectDetail(params.id, params.projectId);
  const supabase = createClient();

  const [{ data: projectRow }, { data: orderRow }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "project_name, value, customer_id, start_date, start_date_confirmed, status"
      )
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

  const startDateConfirmed = Boolean(projectRow?.start_date_confirmed);
  if (startDateConfirmed && projectRow?.start_date) {
    project.startDate = formatProjectDate(projectRow.start_date as string);
  } else {
    project.startDate = null;
  }

  const status =
    typeof projectRow?.status === "string" && isProjectStatus(projectRow.status)
      ? projectRow.status
      : "active";

  if (status === "in_progress") {
    project.readinessLabel = "In Progress";
    project.readinessSubtext = "Project started";
    project.statusLabel = "In Progress";
    project.progressPercent = Math.max(project.progressPercent, 10);
  }

  const materialOrder = (orderRow as MaterialOrder | null) ?? null;

  return (
    <ProjectDetailPage
      project={project}
      materialOrder={materialOrder}
      projectStatus={status}
      startDateConfirmed={startDateConfirmed}
      rawStartDate={
        startDateConfirmed && projectRow?.start_date
          ? String(projectRow.start_date)
          : null
      }
    />
  );
}
