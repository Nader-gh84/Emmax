"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { UserMenu } from "@/components/dashboard/user-menu";

export function DashboardTopHeader() {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-end gap-2 border-b border-white/10 bg-navy/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
      <Link
        href="/dashboard/voice-quote-builder"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-lg font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        aria-label="New project"
        title="New project"
      >
        +
      </Link>
      <NotificationBell />
      {/* Sidebar is hidden below lg — keep account access on mobile/tablet. */}
      <div className="lg:hidden">
        <UserMenu variant="compact" menuAlign="right" />
      </div>
    </div>
  );
}

/** @deprecated Use DashboardTopHeader — kept for import compatibility. */
export function DashboardMobileHeader() {
  return <DashboardTopHeader />;
}
