import { redirect } from "next/navigation";
import { DashboardBottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardTopHeader } from "@/components/dashboard/mobile-header";
import { WorkspaceSidebar } from "@/components/dashboard/workspace-sidebar";
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

  return (
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
  );
}
