"use client";

import { NotificationBell } from "@/components/dashboard/notification-bell";

export function DashboardMobileHeader() {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-end border-b border-white/10 bg-navy/95 px-4 py-3 backdrop-blur-md md:hidden">
      <NotificationBell />
    </div>
  );
}
