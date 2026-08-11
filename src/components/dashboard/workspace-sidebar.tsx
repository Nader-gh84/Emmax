"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { IconMicrophone } from "@/components/dashboard/icons";
import { UserMenu } from "@/components/dashboard/user-menu";
import { IconWaveform } from "@/components/dashboard/workspace-icons";
import {
  isWorkspaceNavItemActive,
  workspaceNavItems,
} from "@/components/dashboard/workspace-nav";
import { UnreadCountBadge } from "@/components/dashboard/unread-count-badge";
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
  const pathname = usePathname();
  const hideEmaWidget = pathname === "/dashboard/today";

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-[#0B1220] lg:flex">
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
        {!hideEmaWidget ? (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-cyan-400 text-sm font-bold text-white shadow-lg shadow-accent/30">
                Ema
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Hi! I&apos;m Ema</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  Your AI teammate. Ask me anything.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition hover:bg-blue-600"
                aria-label="Start voice input"
              >
                <IconMicrophone className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-navy/60 px-3 py-2">
                <IconWaveform className="h-4 w-4 shrink-0 text-cyan-400" />
                <span className="truncate text-xs font-medium text-slate-300">
                  Listening...
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-1.5 py-1">
          <UserMenu variant="sidebar" menuAlign="left" />
        </div>
      </div>
    </aside>
  );
}
