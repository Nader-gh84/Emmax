"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { dashboardNavItems } from "@/components/dashboard/nav-items";

interface DashboardSidebarProps {
  email: string;
}

export function DashboardSidebar({ email }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-navy md:flex">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Link href="/" className="shrink-0">
          <Image
            src="/images/logo.png"
            alt="EmaX"
            width={120}
            height={36}
            className="h-9 w-auto"
            priority
          />
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
        <p className="truncate text-xs text-slate-500">Signed in as</p>
        <p className="mt-1 truncate text-sm font-medium text-slate-300">
          {email}
        </p>
        <div className="mt-4">
          <SignOutButton className="w-full min-h-[44px] rounded-lg border border-white/20 px-4 py-2 text-base font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </div>
    </aside>
  );
}
