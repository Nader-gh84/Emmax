export type WorkflowStepId =
  | "voice_materials"
  | "send_supplier"
  | "upload_prices"
  | "create_quote"
  | "send_customer"
  | "customer_accept"
  | "order_materials"
  | "materials_ready"
  | "schedule_project"
  | "start_project";

export type WorkflowStepState = "completed" | "active" | "locked";

export type ProjectStatusTone =
  | "waiting"
  | "sent"
  | "accepted"
  | "ready"
  | "start";

export interface WorkflowStepDefinition {
  id: WorkflowStepId;
  number: number;
  title: string;
  description: string;
}

export interface ProjectWorkflowStep {
  id: WorkflowStepId;
  state: WorkflowStepState;
  completedDate?: string | null;
  actionLabel?: string | null;
}

export interface PreInvoiceProjectCard {
  id: string;
  projectNumber: string;
  title: string;
  favorited: boolean;
  statusLabel: string;
  statusTone: ProjectStatusTone;
  customerName: string;
  address: string;
  priceLabel: string;
  materialsCount: number;
  createdLabel: string;
  nextActionText: string;
  steps: ProjectWorkflowStep[];
}

export const PRE_INVOICE_WORKFLOW_STEPS: WorkflowStepDefinition[] = [
  {
    id: "voice_materials",
    number: 1,
    title: "Voice & Materials",
    description: "Extract materials with voice",
  },
  {
    id: "send_supplier",
    number: 2,
    title: "Send to Supplier",
    description: "Request pricing from suppliers",
  },
  {
    id: "upload_prices",
    number: 3,
    title: "Upload Prices",
    description: "Upload supplier pricing",
  },
  {
    id: "create_quote",
    number: 4,
    title: "Create Quote",
    description: "Generate quote for customer",
  },
  {
    id: "send_customer",
    number: 5,
    title: "Send to Customer",
    description: "Send quote to customer",
  },
  {
    id: "customer_accept",
    number: 6,
    title: "Customer Accept",
    description: "Wait for customer confirmation",
  },
  {
    id: "order_materials",
    number: 7,
    title: "Order Materials",
    description: "Order materials from suppliers",
  },
  {
    id: "materials_ready",
    number: 8,
    title: "Materials Ready",
    description: "Receive and confirm materials",
  },
  {
    id: "schedule_project",
    number: 9,
    title: "Schedule Project",
    description: "Set project start date",
  },
  {
    id: "start_project",
    number: 10,
    title: "Start Project",
    description: "Begin the project",
  },
];

function buildSteps(
  completedThrough: number,
  activeStep: number,
  actionLabel: string,
  completedDates: Partial<Record<number, string>>
): ProjectWorkflowStep[] {
  return PRE_INVOICE_WORKFLOW_STEPS.map((step) => {
    if (step.number <= completedThrough) {
      return {
        id: step.id,
        state: "completed" as const,
        completedDate: completedDates[step.number] ?? null,
        actionLabel: null,
      };
    }
    if (step.number === activeStep) {
      return {
        id: step.id,
        state: "active" as const,
        completedDate: null,
        actionLabel,
      };
    }
    return {
      id: step.id,
      state: "locked" as const,
      completedDate: null,
      actionLabel: null,
    };
  });
}

export const PRE_INVOICE_STATS = [
  { id: "all", label: "All Pre-Invoices", count: 3, tone: "neutral" as const },
  {
    id: "waiting",
    label: "Waiting for Price",
    count: 1,
    tone: "waiting" as const,
  },
  { id: "sent", label: "Quote Sent", count: 1, tone: "sent" as const },
  {
    id: "accepted",
    label: "Customer Accepted",
    count: 1,
    tone: "accepted" as const,
  },
  {
    id: "ready_order",
    label: "Ready to Order",
    count: 1,
    tone: "ready" as const,
  },
  {
    id: "ready_start",
    label: "Ready to Start",
    count: 0,
    tone: "start" as const,
  },
];

export const MOCK_PRE_INVOICE_PROJECTS: PreInvoiceProjectCard[] = [
  {
    id: "proj-kitchen-1",
    projectNumber: "PI-1042",
    title: "Kitchen Renovation",
    favorited: true,
    statusLabel: "Waiting for Price",
    statusTone: "waiting",
    customerName: "Sarah Chen",
    address: "214 Maple Avenue, North Vancouver, BC",
    priceLabel: "$24,850",
    materialsCount: 6,
    createdLabel: "Jul 28, 2026",
    nextActionText:
      "Next Action: Send material request to suppliers to get pricing",
    steps: buildSteps(1, 2, "Send Now", {
      1: "Jul 28",
    }),
  },
  {
    id: "proj-bath-2",
    projectNumber: "PI-1038",
    title: "Bathroom Remodel",
    favorited: false,
    statusLabel: "Quote Sent",
    statusTone: "sent",
    customerName: "James Patel",
    address: "88 Harbor Road, Burnaby, BC",
    priceLabel: "$12,420",
    materialsCount: 9,
    createdLabel: "Jul 22, 2026",
    nextActionText: "Waiting for customer to review and accept the quote",
    steps: buildSteps(4, 5, "Resend Quote", {
      1: "Jul 22",
      2: "Jul 23",
      3: "Jul 24",
      4: "Jul 25",
    }),
  },
  {
    id: "proj-basement-3",
    projectNumber: "PI-1031",
    title: "Basement Finishing",
    favorited: true,
    statusLabel: "Customer Accepted",
    statusTone: "accepted",
    customerName: "Emily Nguyen",
    address: "450 Oak Street, Surrey, BC",
    priceLabel: "$38,900",
    materialsCount: 14,
    createdLabel: "Jul 12, 2026",
    nextActionText:
      "Customer accepted the quote. Next step: Order materials from suppliers",
    steps: buildSteps(6, 7, "Order Materials", {
      1: "Jul 12",
      2: "Jul 13",
      3: "Jul 15",
      4: "Jul 16",
      5: "Jul 17",
      6: "Jul 30",
    }),
  },
];
