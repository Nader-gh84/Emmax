"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { dashboardNavItems } from "@/components/dashboard/nav-items";
import { BuildVersionIndicator } from "@/components/layout/build-version-indicator";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { getUserDisplayName, getUserInitials } from "@/lib/user-display";

interface DashboardSidebarProps {
  email: string;
  fullName: string;
}

export function DashboardSidebar({ email, fullName }: DashboardSidebarProps) {
  const pathname = usePathname();
  const initials = getUserInitials(fullName, email);
  const displayName = getUserDisplayName(fullName, email);
  const isSettingsActive = pathname.startsWith("/dashboard/settings");

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-navy md:flex">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Link href="/" className="flex shrink-0 flex-col items-start gap-0.5">
          <Image
            src="/images/logo.png"
            alt="EmaX"
            width={120}
            height={36}
            className="h-9 w-auto"
            priority
          />
          <BuildVersionIndicator />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {dashboardNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-[44px] items-center gap-3 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-blue-600"
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings"
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 transition hover:bg-white/5 ${
              isSettingsActive ? "bg-white/10" : ""
            }`}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-navy text-sm font-semibold text-white"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {displayName}
              </p>
              <p className="truncate text-xs text-slate-500">View profile</p>
            </div>
          </Link>

          <NotificationBell />

          <SignOutButton
            iconOnly
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>
    </aside>
  );
}
