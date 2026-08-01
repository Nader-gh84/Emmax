import { WorkspaceHome } from "@/components/dashboard/workspace-home";
import { createClient } from "@/lib/supabase/server";

function getFirstName(fullName: string | null | undefined, email: string | null | undefined) {
  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0];
  }

  if (email) {
    const local = email.split("@")[0] ?? "";
    const segment = local.split(/[._-]/)[0] ?? "";
    if (segment) {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  }

  return "there";
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("business_profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const firstName = getFirstName(profile?.full_name, user?.email);

  let activeProjectsCount = 0;
  if (user) {
    const { count, error } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");

    if (error) {
      console.error(
        "[Dashboard] active projects count failed (run migration 018?):",
        error.message
      );
    } else {
      activeProjectsCount = count ?? 0;
    }
  }

  return (
    <WorkspaceHome
      firstName={firstName}
      activeProjectsCount={activeProjectsCount}
    />
  );
}
