import {
  IconCalendar,
  IconEmployee,
  IconHome,
  IconInbox,
  IconSettings,
  IconSuppliers,
  IconUsers,
} from "@/components/dashboard/icons";
import { IconProjects } from "@/components/dashboard/workspace-icons";

export const workspaceNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    matchPath: "/dashboard",
    icon: IconHome,
  },
  {
    label: "Inbox",
    href: "/dashboard/inbox",
    matchPath: "/dashboard/inbox",
    icon: IconInbox,
  },
  {
    label: "Customer",
    href: "/dashboard/customers",
    matchPath: "/dashboard/customers",
    icon: IconUsers,
  },
  {
    label: "Supplier",
    href: "/dashboard/suppliers",
    matchPath: "/dashboard/suppliers",
    icon: IconSuppliers,
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    matchPath: "/dashboard/projects",
    icon: IconProjects,
  },
  {
    label: "Employee",
    href: "/dashboard/employees",
    matchPath: "/dashboard/employees",
    icon: IconEmployee,
  },
  {
    label: "Advance Setting",
    href: "/dashboard/settings",
    matchPath: "/dashboard/settings",
    icon: IconSettings,
  },
  {
    label: "Today",
    href: "/dashboard/today",
    matchPath: "/dashboard/today",
    icon: IconCalendar,
  },
] as const;

export function isWorkspaceNavItemActive(
  item: (typeof workspaceNavItems)[number],
  pathname: string,
  _section: string | null
): boolean {
  if (item.matchPath === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (item.matchPath === "/dashboard/projects") {
    return (
      pathname.startsWith("/dashboard/projects") ||
      pathname.startsWith("/dashboard/quotes")
    );
  }

  return pathname.startsWith(item.matchPath);
}
