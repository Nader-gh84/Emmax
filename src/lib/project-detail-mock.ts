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

/** Kitchen renovation mock for visual review (Ali Tajdar). */
export function getMockProjectDetail(
  customerId = "mock-customer-ali",
  projectId = "mock-project-kitchen"
): ProjectDetailMock {
  return {
    id: projectId,
    customerId,
    projectName: "Kitchen Renovation",
    statusLabel: "Quote Accepted",
    readinessLabel: "Ready to Start",
    readinessSubtext: "Not started yet",
    customerName: "Ali Tajdar",
    customerPhone: "(604) 555-0142",
    address: "1847 Maple Ridge Ave, Vancouver, BC V6J 2N8",
    acceptedDate: "Jul 28, 2026",
    quoteAmount: 18450,
    startDate: null,
    progressPercent: 0,
    description:
      "Full kitchen renovation including cabinet replacement, quartz countertops, backsplash tile, plumbing fixture upgrades, and electrical rough-in for under-cabinet lighting. Customer requested a modern matte-black and white finish with soft-close hardware throughout.",
    projectType: "Residential Renovation",
    projectManager: "Unassigned",
    internalProjectNumber: "PRJ-2025-0056",
    quoteStatus: "Accepted",
    depositRequired: 3690,
    depositStatus: "Not Paid",
    scopeItems: [
      "Remove existing cabinets, counters, and sink",
      "Install new soft-close base and wall cabinets",
      "Fabricate and install quartz countertops",
      "Tile backsplash (subway, full height)",
      "Rough-in and install under-cabinet LED lighting",
      "Replace sink, faucet, and dishwasher shutoffs",
      "Paint ceiling and adjacent walls to match",
      "Final cleanup and walkthrough with customer",
    ],
    nextSteps: [
      {
        id: "1",
        label: "Set project start date",
        tag: "Required",
        tagTone: "required",
      },
      {
        id: "2",
        label: "Review and confirm scope",
        tag: "2 items",
        tagTone: "info",
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
    ],
    taskStats: {
      toDo: 8,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    },
    materialStats: {
      notOrdered: 4,
      ordered: 2,
      received: 2,
      used: 0,
      returned: 0,
    },
    materialsReceivedPercent: 25,
  };
}

export function formatProjectDetailMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}
