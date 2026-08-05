export type CustomerDetailsTab =
  | "overview"
  | "projects"
  | "documents"
  | "financial"
  | "payments"
  | "locations"
  | "timeline"
  | "notes";

export interface CustomerLocation {
  id: string;
  label: string;
  address: string;
  isPrimary?: boolean;
}

export interface CustomerActivityItem {
  id: string;
  type:
    | "payment_received"
    | "invoice_overdue"
    | "project_started"
    | "quote_accepted"
    | "quote_declined"
    | "note_added";
  title: string;
  description?: string;
  amount?: number | null;
  occurredAt: string;
}

export interface CustomerDetailsViewModel {
  id: string;
  displayId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  company: string | null;
  status: "active" | "inactive";
  customerSince: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  preferredContact: string;
  customerSource: string;
  lastContactAt: string | null;
  tags: string[];
  notes: string | null;
  counts: {
    projects: number;
    documents: number;
    financial: number;
    payments: number;
    locations: number;
    notes: number;
  };
  /** Real rollup when wired; null hides the banner. */
  outstanding: {
    projectCount: number;
    totalOutstanding: number;
  } | null;
  locations: CustomerLocation[];
  recentActivity: CustomerActivityItem[];
}

/** Stage 1 mock detail payload — structure only; later stages wire real data. */
export function buildMockCustomerDetails(input?: {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}): CustomerDetailsViewModel {
  const firstName = input?.firstName?.trim() || "Sarah";
  const lastName = input?.lastName?.trim() || "Mitchell";
  const fullName = `${firstName} ${lastName}`.trim();
  const id = input?.id || "demo-customer";
  const short = id.replace(/-/g, "").slice(0, 4).toUpperCase() || "1042";

  return {
    id,
    displayId: `C-${short}`,
    firstName,
    lastName,
    fullName,
    company: "Mitchell Residence",
    status: "active",
    customerSince: input?.createdAt || "2024-03-12T00:00:00.000Z",
    phone: input?.phone || "(604) 555-0188",
    email: input?.email || "sarah.mitchell@email.com",
    address:
      input?.address || "1428 West 14th Avenue, Vancouver, BC V6H 1R3",
    preferredContact: "Mobile",
    customerSource: "Referral",
    lastContactAt: "2026-07-22T16:30:00.000Z",
    tags: ["Residential", "Repeat Customer"],
    notes:
      input?.notes ||
      "Prefers morning appointments. Gate code 4421. Dog on site.",
    counts: {
      projects: 4,
      documents: 12,
      financial: 0,
      payments: 0,
      locations: 2,
      notes: 3,
    },
    // Banner is wired from real project financials on the route — stay hidden in mock.
    outstanding: null,
    locations: [
      {
        id: "loc-1",
        label: "Main Address",
        address: input?.address || "1428 West 14th Avenue, Vancouver, BC V6H 1R3",
        isPrimary: true,
      },
      {
        id: "loc-2",
        label: "Job Site",
        address: "88 Pacific Boulevard, Vancouver, BC V6Z 2X9",
      },
    ],
    recentActivity: [
      {
        id: "act-1",
        type: "payment_received",
        title: "Payment received",
        description: "Invoice INV-2041",
        amount: 1850,
        occurredAt: "2026-07-22T14:10:00.000Z",
      },
      {
        id: "act-2",
        type: "invoice_overdue",
        title: "Invoice overdue",
        description: "INV-2038 · 14 days past due",
        amount: 2400,
        occurredAt: "2026-07-18T09:00:00.000Z",
      },
      {
        id: "act-3",
        type: "project_started",
        title: "Project started",
        description: "Kitchen electrical upgrade",
        occurredAt: "2026-07-10T08:30:00.000Z",
      },
      {
        id: "act-4",
        type: "quote_accepted",
        title: "Quote accepted",
        description: "Project PQ-1192",
        amount: 6120,
        occurredAt: "2026-07-05T18:45:00.000Z",
      },
    ],
  };
}

export const CUSTOMER_DETAILS_TABS: {
  id: CustomerDetailsTab;
  label: string;
  countKey?: keyof CustomerDetailsViewModel["counts"];
}[] = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects", countKey: "projects" },
  { id: "documents", label: "Documents", countKey: "documents" },
  { id: "financial", label: "Financial", countKey: "financial" },
  { id: "payments", label: "Payments", countKey: "payments" },
  { id: "locations", label: "Locations", countKey: "locations" },
  { id: "timeline", label: "Timeline" },
  { id: "notes", label: "Notes", countKey: "notes" },
];

export function formatCustomerDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCustomerMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getCustomerInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() || "?";
}
