import { redirect } from "next/navigation";
import { DashboardBottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
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
      <DashboardSidebar email={user.email ?? ""} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
          {children}
        </div>
        <DashboardBottomNav />
      </div>
    </div>
  );
}
