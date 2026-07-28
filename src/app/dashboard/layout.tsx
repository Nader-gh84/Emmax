import { redirect } from "next/navigation";
import { DashboardBottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardMobileHeader } from "@/components/dashboard/mobile-header";
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

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen bg-navy text-white">
      <DashboardSidebar
        email={user.email ?? ""}
        fullName={profile?.full_name ?? ""}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileHeader />
        <div className="flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
          {children}
        </div>
        <DashboardBottomNav />
      </div>
    </div>
  );
}
