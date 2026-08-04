import type { SupabaseClient } from "@supabase/supabase-js";

/** Insert a project-scoped activity row (best-effort — never throws). */
export async function logProjectActivity(
  supabase: SupabaseClient,
  input: {
    userId: string;
    projectId: string;
    activityType: string;
    description: string;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("project_activity").insert({
      user_id: input.userId,
      project_id: input.projectId,
      activity_type: input.activityType,
      description: input.description.trim(),
    });
    if (error) {
      console.error("[logProjectActivity]", error.message);
    }
  } catch (error) {
    console.error("[logProjectActivity]", error);
  }
}
