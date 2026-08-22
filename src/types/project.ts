import type { LabourBillingMode } from "@/types/labour-quoting";
import type { StoredLabourItem, StoredMaterial } from "@/types/quote";

export type ProjectStatus = "active" | "in_progress" | "completed" | "on_hold";

export interface Project {
  id: string;
  user_id: string;
  customer_id: string | null;
  quote_id: string | null;
  project_name: string;
  value: number;
  status: ProjectStatus;
  start_date: string;
  start_date_confirmed?: boolean;
  end_date: string | null;
  materials: StoredMaterial[] | null;
  labour_items: StoredLabourItem[] | null;
  /** Snapshot of quote labour_billing_mode. */
  labour_billing_mode?: LabourBillingMode | null;
  notes: string | null;
  project_type: string | null;
  project_manager: string | null;
  address: string | null;
  deposit_amount?: number | null;
  /** Set when closed via the completion checklist. */
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return (
    value === "active" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "on_hold"
  );
}

export function formatProjectDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatProjectMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

export function projectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "on_hold":
      return "On Hold";
    default:
      return status;
  }
}

export function projectStatusClass(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "bg-accent/15 text-accent ring-accent/30";
    case "in_progress":
      return "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30";
    case "completed":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "on_hold":
      return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    default:
      return "bg-white/10 text-slate-300 ring-white/15";
  }
}

/** True when the stored name is missing or the RPC/app placeholder. */
export function isPlaceholderProjectName(
  value: string | null | undefined
): boolean {
  const trimmed = value?.trim() ?? "";
  return !trimmed || trimmed.toLowerCase() === "untitled project";
}

/**
 * Resolve a display name for a project.
 * Prefer the project's own name, then linked quote project_name / quote_number.
 */
export function resolveProjectDisplayName(
  projectName: string | null | undefined,
  linkedQuote?: {
    project_name?: string | null;
    quote_number?: string | null;
  } | null
): string {
  const own = projectName?.trim() ?? "";
  if (own && !isPlaceholderProjectName(own)) return own;

  const fromQuote = linkedQuote?.project_name?.trim() ?? "";
  if (fromQuote) return fromQuote;

  const quoteNumber = linkedQuote?.quote_number?.trim() ?? "";
  if (quoteNumber) return quoteNumber;

  return own || "Untitled project";
}

export function asProjectMaterials(
  value: Project["materials"]
): NonNullable<Project["materials"]> {
  return Array.isArray(value) ? value : [];
}

export function asProjectLabour(
  value: Project["labour_items"]
): NonNullable<Project["labour_items"]> {
  return Array.isArray(value) ? value : [];
}
