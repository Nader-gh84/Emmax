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
    icon: IconHome,
  },
  {
    label: "Inbox",
    href: "/dashboard/inbox",
    icon: IconInbox,
  },
  {
    label: "Customer",
    href: "/dashboard/customers",
    icon: IconUsers,
  },
  {
    label: "Supplier",
    href: "/dashboard/suppliers",
    icon: IconSuppliers,
  },
  {
    label: "Projects",
    href: "/dashboard/quotes",
    icon: IconProjects,
  },
  {
    label: "Employee",
    href: "/dashboard/employees",
    icon: IconEmployee,
  },
  {
    label: "Advance Setting",
    href: "/dashboard/settings",
    icon: IconSettings,
  },
  {
    label: "Calendar",
    href: "/dashboard/calendar",
    icon: IconCalendar,
  },
] as const;
