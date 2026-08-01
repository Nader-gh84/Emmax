import type { Metadata } from "next";
import { ProjectDetailPage } from "@/components/projects/project-detail-page";
import { getMockProjectDetail } from "@/lib/project-detail-mock";

export const metadata: Metadata = {
  title: "Project Details",
};

export default function ProjectDetailRoute({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  // UI-only shell: always render kitchen renovation mock for visual review.
  // Real Supabase wiring comes in follow-up prompts.
  const project = getMockProjectDetail(params.id, params.projectId);

  return <ProjectDetailPage project={project} />;
}
