import {
  customerTypeLabel,
  getCustomerDisplayName,
  isCustomerType,
  type Customer,
  type CustomerDocument,
  type CustomerNote,
  type CustomerType,
} from "@/types/customer";
import type { Project, ProjectStatus } from "@/types/project";

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
  type: string;
  title: string;
  description?: string;
  amount?: number | null;
  occurredAt: string;
  projectName?: string | null;
}

export interface CustomerDetailsViewModel {
  id: string;
  displayId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  customerType: CustomerType;
  website: string | null;
  status: "active" | "inactive";
  customerSince: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  lastContactAt: string | null;
  /** Latest note text for the sidebar preview. */
  notesPreview: string | null;
  counts: {
    projects: number;
    documents: number;
    financial: number;
    payments: number;
    locations: number;
    notes: number;
  };
  outstanding: {
    projectCount: number;
    totalOutstanding: number;
  } | null;
  locations: CustomerLocation[];
  recentActivity: CustomerActivityItem[];
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

const OPEN_PROJECT_STATUSES: ProjectStatus[] = [
  "active",
  "in_progress",
  "on_hold",
];

export function deriveCustomerStatus(
  projects: Array<{ status: string }>
): "active" | "inactive" {
  if (projects.length === 0) return "active";
  const hasOpen = projects.some((project) =>
    OPEN_PROJECT_STATUSES.includes(project.status as ProjectStatus)
  );
  return hasOpen ? "active" : "inactive";
}

export function buildCustomerLocations(input: {
  customerId: string;
  customerAddress: string | null | undefined;
  projects: Array<{ id: string; address: string | null; project_name: string }>;
}): CustomerLocation[] {
  const locations: CustomerLocation[] = [];
  const primary = input.customerAddress?.trim() || "";
  const seen = new Set<string>();

  if (primary) {
    const key = primary.toLowerCase();
    seen.add(key);
    locations.push({
      id: `primary-${input.customerId}`,
      label: "Main Address",
      address: primary,
      isPrimary: true,
    });
  }

  for (const project of input.projects) {
    const address = project.address?.trim() || "";
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push({
      id: `project-${project.id}`,
      label: project.project_name?.trim() || "Job Site",
      address,
    });
  }

  return locations;
}

function maxTimestamp(
  values: Array<string | null | undefined>
): string | null {
  let maxMs: number | null = null;
  for (const value of values) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (Number.isNaN(ms)) continue;
    if (maxMs === null || ms > maxMs) maxMs = ms;
  }
  return maxMs === null ? null : new Date(maxMs).toISOString();
}

/**
 * Last Contact = max of:
 * - latest project_activity across customer projects
 * - latest quote sent_at (fallback updated_at for sent/accepted/declined)
 * - latest project payment date
 * - customers.last_quoted_at
 */
export function computeLastContactAt(input: {
  lastQuotedAt: string | null | undefined;
  activityDates: Array<string | null | undefined>;
  paymentDates: Array<string | null | undefined>;
  quotes: Array<{
    status: string | null;
    sent_at: string | null;
    updated_at: string | null;
  }>;
}): string | null {
  const quoteDates = input.quotes
    .filter((quote) => {
      const status = quote.status ?? "";
      return (
        status === "sent" ||
        status === "accepted" ||
        status === "declined" ||
        Boolean(quote.sent_at)
      );
    })
    .map((quote) => quote.sent_at || quote.updated_at);

  return maxTimestamp([
    ...input.activityDates,
    ...quoteDates,
    ...input.paymentDates,
    input.lastQuotedAt,
  ]);
}

function humanizeActivityType(activityType: string): string {
  const normalized = activityType.trim().replace(/[_-]+/g, " ");
  if (!normalized) return "Activity";
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function mapProjectActivityToItems(input: {
  activities: Array<{
    id: string;
    activity_type: string;
    description: string | null;
    created_at: string;
    project_id: string;
  }>;
  projectNames: Record<string, string>;
}): CustomerActivityItem[] {
  return input.activities.map((row) => ({
    id: row.id,
    type: row.activity_type || "activity",
    title: humanizeActivityType(row.activity_type || "activity"),
    description: row.description?.trim() || undefined,
    occurredAt: row.created_at,
    projectName: input.projectNames[row.project_id] ?? null,
  }));
}

export function buildCustomerDetailsViewModel(input: {
  customer: Customer;
  projects: Project[];
  documents: CustomerDocument[];
  notes: CustomerNote[];
  paymentCount: number;
  outstanding: {
    projectCount: number;
    totalOutstanding: number;
  } | null;
  lastContactAt: string | null;
  recentActivity: CustomerActivityItem[];
}): CustomerDetailsViewModel {
  const customer = input.customer;
  const customerType = isCustomerType(customer.customer_type)
    ? customer.customer_type
    : "residential";
  const short =
    customer.id.replace(/-/g, "").slice(0, 4).toUpperCase() || "0000";
  const locations = buildCustomerLocations({
    customerId: customer.id,
    customerAddress: customer.address,
    projects: input.projects,
  });
  const latestNote = input.notes[0]?.note_text?.trim() || null;

  return {
    id: customer.id,
    displayId: `C-${short}`,
    firstName: customer.first_name,
    lastName: customer.last_name,
    fullName: getCustomerDisplayName(customer),
    customerType,
    website: customer.website?.trim() || null,
    status: deriveCustomerStatus(input.projects),
    customerSince: customer.created_at,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    lastContactAt: input.lastContactAt,
    notesPreview: latestNote,
    counts: {
      projects: input.projects.length,
      documents: input.documents.length,
      financial: input.projects.length,
      payments: input.paymentCount,
      locations: locations.length,
      notes: input.notes.length,
    },
    outstanding: input.outstanding,
    locations,
    recentActivity: input.recentActivity,
  };
}

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

export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address.trim()
  )}`;
}

export { customerTypeLabel };
