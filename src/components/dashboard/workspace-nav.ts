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
    href: "/dashboard/quotes",
    matchPath: "/dashboard/quotes",
    icon: IconProjects,
  },
  {
    label: "Employee",
    // Points into Advance Setting > Employees (no separate data store on the old placeholder route).
    href: "/dashboard/settings?section=employees",
    matchPath: "/dashboard/settings",
    matchSection: "employees",
    icon: IconEmployee,
  },
  {
    label: "Advance Setting",
    href: "/dashboard/settings",
    matchPath: "/dashboard/settings",
    // Active for business settings (and any future non-employee sections).
    matchSection: null,
    icon: IconSettings,
  },
  {
    label: "Calendar",
    href: "/dashboard/calendar",
    matchPath: "/dashboard/calendar",
    icon: IconCalendar,
  },
] as const;

export function isWorkspaceNavItemActive(
  item: (typeof workspaceNavItems)[number],
  pathname: string,
  section: string | null
): boolean {
  if (item.matchPath === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (!pathname.startsWith(item.matchPath)) {
    return false;
  }

  if ("matchSection" in item) {
    if (item.matchSection === "employees") {
      return section === "employees";
    }
    if (item.matchSection === null) {
      return section !== "employees";
    }
  }

  return true;
}
