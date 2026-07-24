"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  IconDocument,
  IconHome,
  IconMicrophone,
  IconSettings,
  IconUsers,
} from "@/components/dashboard/icons";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: IconHome,
    highlight: false,
  },
  {
    label: "New Quote",
    href: "/dashboard/new-quote",
    icon: IconMicrophone,
    highlight: true,
  },
  {
    label: "Quotes",
    href: "/dashboard/quotes",
    icon: IconDocument,
    highlight: false,
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: IconUsers,
    highlight: false,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: IconSettings,
    highlight: false,
  },
];

interface DashboardSidebarProps {
  email: string;
}

export function DashboardSidebar({ email }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-navy">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Link href="/" className="text-xl font-bold text-white">
          Ema<span className="text-accent">X</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-blue-600"
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
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
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
          <SignOutButton className="w-full rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </div>
    </aside>
  );
}
