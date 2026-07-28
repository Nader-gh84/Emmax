import {
  IconCalendar,
  IconEmployee,
  IconHome,
  IconInvoice,
  IconSettings,
  IconSuppliers,
  IconUsers,
} from "@/components/dashboard/icons";

export const workspaceNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: IconHome,
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
    label: "Pre Invoice",
    href: "/dashboard/quotes",
    icon: IconInvoice,
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
