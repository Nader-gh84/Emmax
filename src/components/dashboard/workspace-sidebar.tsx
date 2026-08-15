"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { UserMenu } from "@/components/dashboard/user-menu";
import {
  isWorkspaceNavItemActive,
  workspaceNavItems,
} from "@/components/dashboard/workspace-nav";
import { UnreadCountBadge } from "@/components/dashboard/unread-count-badge";
import { EmCallSidebarLauncher } from "@/components/em-call/em-call-launcher";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";

function WorkspaceSidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const { unreadCount } = useUnreadNotifications(20);

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {workspaceNavItems.map((item) => {
        const isActive = isWorkspaceNavItemActive(item, pathname, section);
        const Icon = item.icon;
        const showInboxBadge =
          item.href === "/dashboard/inbox" && unreadCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-accent/15 text-white ring-1 ring-accent/40"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon
              className={`h-5 w-5 shrink-0 ${
                isActive ? "text-accent" : "text-slate-500"
              }`}
            />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {showInboxBadge ? <UnreadCountBadge count={unreadCount} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function WorkspaceSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-[#14263D] lg:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" className="flex flex-col items-start gap-1">
          <Image
            src="/images/logo-v2.png"
            alt="EmaX"
            width={120}
            height={36}
            className="h-8 w-auto"
            priority
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
            AI Assistant
          </span>
        </Link>
      </div>

      <Suspense
        fallback={
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {workspaceNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Icon className="h-5 w-5 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        }
      >
        <WorkspaceSidebarNav />
      </Suspense>

      <div className="space-y-3 p-3">
        <EmCallSidebarLauncher />

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-1.5 py-1">
          <UserMenu variant="sidebar" menuAlign="left" />
        </div>
      </div>
    </aside>
  );
}
