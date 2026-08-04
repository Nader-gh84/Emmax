import {
  formatProjectDate,
  projectStatusLabel,
  type ProjectStatus,
} from "@/types/project";

export type ProjectDetailTab =
  | "overview"
  | "scope"
  | "tasks"
  | "materials"
  | "documents"
  | "financials"
  | "activity";

export interface ProjectDetailMock {
  id: string;
  customerId: string;
  projectName: string;
  statusLabel: string;
  readinessLabel: string;
  readinessSubtext: string;
  customerName: string;
  customerPhone: string;
  address: string;
  acceptedDate: string;
  quoteAmount: number;
  startDate: string | null;
  progressPercent: number;
  description: string;
  projectType: string;
  projectManager: string;
  internalProjectNumber: string;
  quoteStatus: string;
  depositRequired: number;
  depositStatus: string;
  scopeItems: string[];
  nextSteps: {
    id: string;
    label: string;
    tag: string;
    tagTone: "required" | "info" | "optional" | "locked" | "done";
    disabled?: boolean;
    completed?: boolean;
  }[];
  taskStats: {
    toDo: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  materialStats: {
    notOrdered: number;
    ordered: number;
    received: number;
    used: number;
    returned: number;
  };
  materialsReceivedPercent: number;
}

export const PROJECT_DETAIL_TABS: {
  id: ProjectDetailTab;
  label: string;
}[] = [
  { id: "overview", label: "Overview" },
  { id: "scope", label: "Scope of Work" },
  { id: "tasks", label: "Tasks" },
  { id: "materials", label: "Materials" },
  { id: "documents", label: "Documents" },
  { id: "financials", label: "Financials" },
  { id: "activity", label: "Activity" },
];

const DEFAULT_NEXT_STEPS: ProjectDetailMock["nextSteps"] = [
  {
    id: "1",
    label: "Set project start date",
    tag: "Required",
    tagTone: "required",
  },
  {
    id: "2",
    label: "Review and confirm scope",
    tag: "Optional",
    tagTone: "optional",
  },
  {
    id: "3",
    label: "Setup team members",
    tag: "Optional",
    tagTone: "optional",
  },
  {
    id: "4",
    label: "Order materials",
    tag: "Optional",
    tagTone: "optional",
  },
  {
    id: "5",
    label: "Start project",
    tag: "After completing above",
    tagTone: "locked",
    disabled: true,
  },
];

function readinessForStatus(status: ProjectStatus): {
  statusLabel: string;
  readinessLabel: string;
  readinessSubtext: string;
  progressPercent: number;
} {
  switch (status) {
    case "in_progress":
      return {
        statusLabel: "In Progress",
        readinessLabel: "In Progress",
        readinessSubtext: "Project started",
        progressPercent: 10,
      };
    case "completed":
      return {
        statusLabel: projectStatusLabel(status),
        readinessLabel: "Completed",
        readinessSubtext: "Project finished",
        progressPercent: 100,
      };
    case "on_hold":
      return {
        statusLabel: projectStatusLabel(status),
        readinessLabel: "On Hold",
        readinessSubtext: "Paused",
        progressPercent: 0,
      };
    case "active":
    default:
      return {
        statusLabel: "Quote Accepted",
        readinessLabel: "Ready to Start",
        readinessSubtext: "Not started yet",
        progressPercent: 0,
      };
  }
}

/** Build the Project Detail view model from live Supabase records (no mock customer/project). */
export function buildProjectDetailViewModel(input: {
  id: string;
  customerId: string;
  projectName: string;
  customerName: string;
  customerPhone?: string | null;
  address?: string | null;
  quoteAmount: number;
  status: ProjectStatus;
  startDateConfirmed: boolean;
  startDate?: string | null;
  description?: string | null;
  scopeItems?: string[];
  acceptedAt?: string | null;
  quoteNumber?: string | null;
  materialLineCount?: number;
  materialsReceived?: boolean;
  materialsOrdered?: boolean;
}): ProjectDetailMock {
  const readiness = readinessForStatus(input.status);
  const materialCount = Math.max(0, input.materialLineCount ?? 0);
  const materialsReceived = Boolean(input.materialsReceived);
  const materialsOrdered = Boolean(input.materialsOrdered) || materialsReceived;

  let materialStats: ProjectDetailMock["materialStats"];
  if (materialCount === 0) {
    materialStats = {
      notOrdered: 0,
      ordered: 0,
      received: 0,
      used: 0,
      returned: 0,
    };
  } else if (materialsReceived) {
    materialStats = {
      notOrdered: 0,
      ordered: 0,
      received: materialCount,
      used: 0,
      returned: 0,
    };
  } else if (materialsOrdered) {
    materialStats = {
      notOrdered: 0,
      ordered: materialCount,
      received: 0,
      used: 0,
      returned: 0,
    };
  } else {
    materialStats = {
      notOrdered: materialCount,
      ordered: 0,
      received: 0,
      used: 0,
      returned: 0,
    };
  }

  const startDate =
    input.startDateConfirmed && input.startDate
      ? formatProjectDate(input.startDate)
      : null;

  const acceptedDate = input.acceptedAt
    ? formatProjectDate(input.acceptedAt)
    : "—";

  const shortId = input.id.replace(/-/g, "").slice(0, 8).toUpperCase();

  return {
    id: input.id,
    customerId: input.customerId,
    projectName: input.projectName.trim() || "Untitled project",
    statusLabel: readiness.statusLabel,
    readinessLabel: readiness.readinessLabel,
    readinessSubtext: readiness.readinessSubtext,
    customerName: input.customerName.trim() || "Customer",
    customerPhone: input.customerPhone?.trim() || "—",
    address: input.address?.trim() || "—",
    acceptedDate,
    quoteAmount: Number(input.quoteAmount) || 0,
    startDate,
    progressPercent: readiness.progressPercent,
    description: input.description?.trim() || "",
    projectType: "Project",
    projectManager: "Unassigned",
    internalProjectNumber:
      input.quoteNumber?.trim() || (shortId ? `PRJ-${shortId}` : "—"),
    quoteStatus: "Accepted",
    depositRequired: 0,
    depositStatus: "Not Paid",
    scopeItems: (input.scopeItems ?? []).map((s) => s.trim()).filter(Boolean),
    nextSteps: DEFAULT_NEXT_STEPS.map((step) => ({ ...step })),
    taskStats: {
      toDo: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    },
    materialStats,
    materialsReceivedPercent: materialsReceived
      ? 100
      : materialsOrdered
        ? 50
        : 0,
  };
}

export function formatProjectDetailMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}
