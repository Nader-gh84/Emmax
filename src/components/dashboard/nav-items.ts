import {
  IconDocument,
  IconHome,
  IconMicrophone,
  IconSettings,
  IconSuppliers,
  IconUsers,
} from "@/components/dashboard/icons";

export const dashboardNavItems = [
  {
    label: "Home",
    shortLabel: "Home",
    href: "/dashboard",
    icon: IconHome,
    highlight: false,
  },
  {
    label: "New Quote",
    shortLabel: "Quote",
    href: "/dashboard/voice-quote-builder",
    icon: IconMicrophone,
    highlight: true,
  },
  {
    label: "Pre-Invoices",
    shortLabel: "Pre-Inv",
    href: "/dashboard/quotes",
    icon: IconDocument,
    highlight: false,
  },
  {
    label: "Customers",
    shortLabel: "People",
    href: "/dashboard/customers",
    icon: IconUsers,
    highlight: false,
  },
  {
    label: "Suppliers",
    shortLabel: "Supply",
    href: "/dashboard/suppliers",
    icon: IconSuppliers,
    highlight: false,
  },
  {
    label: "Settings",
    shortLabel: "Settings",
    href: "/dashboard/settings",
    icon: IconSettings,
    highlight: false,
  },
];
