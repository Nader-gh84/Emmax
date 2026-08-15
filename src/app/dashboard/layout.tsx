import { redirect } from "next/navigation";
import { DashboardBottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardTopHeader } from "@/components/dashboard/mobile-header";
import { WorkspaceSidebar } from "@/components/dashboard/workspace-sidebar";
import { EmCallRoot } from "@/components/em-call/em-call-root";
import { getEmCallFirstName } from "@/lib/em-call/greeting";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const greetingName = getEmCallFirstName(profile?.full_name, user.email);

  return (
    <EmCallRoot greetingName={greetingName}>
      <div className="flex min-h-screen bg-navy text-white">
        <WorkspaceSidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <DashboardTopHeader />
          <div className="flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-20 lg:pb-0">
            {children}
          </div>
          <DashboardBottomNav />
        </div>
      </div>
    </EmCallRoot>
  );
}
