import type { MaterialOrder } from "@/types/material-order";
import type { Project } from "@/types/project";
import {
  formatProjectDate,
  formatProjectMoney,
} from "@/types/project";
import type { Quote, StoredMaterial } from "@/types/quote";

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
  | "start"
  | "draft";

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
  projectId: string | null;
  quoteId: string | null;
  customerId: string | null;
  materialOrderId: string | null;
  orderConfirmed: boolean;
  materialsReceived: boolean;
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

function shortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function materialsCount(materials: unknown): number {
  return Array.isArray(materials) ? materials.length : 0;
}

function buildSteps(
  completedThrough: number,
  activeStep: number,
  actionLabel: string | null,
  completedDates: Partial<Record<number, string | null>>
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

/**
 * Infer 10-step workflow progress from quote + optional project/order.
 * There is no dedicated workflow_steps column yet — this is heuristic.
 */
export function mapQuoteToPreInvoiceCard(
  quote: Quote,
  project: Project | null,
  latestOrder: MaterialOrder | null
): PreInvoiceProjectCard {
  const hasMaterials =
    materialsCount(quote.materials) > 0 ||
    materialsCount(project?.materials) > 0;
  const sentToSupplier = Boolean(quote.supplier_ack_token);
  const pricesUploaded = Boolean(quote.supplier_pricing_uploaded_at);
  // Step 4: formal quote prepared (PDF), or already past send/accept.
  const quotePrepared = Boolean(
    quote.quote_prepared_at ||
      quote.status === "sent" ||
      quote.status === "accepted"
  );
  const quoteSentToCustomer =
    quote.status === "sent" ||
    quote.status === "accepted" ||
    Boolean(quote.sent_at);
  const customerAccepted = quote.status === "accepted";
  const orderSent = Boolean(latestOrder);
  const orderConfirmed = latestOrder?.status === "confirmed";
  const materialsReceived = Boolean(latestOrder?.materials_received_at);
  // Step 8 completes only when materials are marked received (Start Project requires this).
  const materialsReady = materialsReceived;
  const scheduled = Boolean(project?.start_date_confirmed);
  const started = project?.status === "in_progress";

  let completedThrough = 0;
  if (hasMaterials) completedThrough = 1;
  if (sentToSupplier) completedThrough = 2;
  if (pricesUploaded) completedThrough = 3;
  if (quotePrepared) completedThrough = Math.max(completedThrough, 4);
  if (quoteSentToCustomer) completedThrough = Math.max(completedThrough, 5);
  if (customerAccepted) completedThrough = 6;
  if (orderSent) completedThrough = 7;
  if (materialsReady) completedThrough = 8;
  if (scheduled) completedThrough = 9;
  if (started) completedThrough = 10;

  let activeStep = Math.min(completedThrough + 1, 10);
  let actionLabel: string | null = null;
  let statusLabel = "Draft";
  let statusTone: ProjectStatusTone = "draft";
  let nextActionText = "Record materials with voice to get started.";

  if (completedThrough === 0) {
    activeStep = 1;
    actionLabel = "Record";
    statusLabel = "Draft";
    statusTone = "draft";
    nextActionText = "Next Action: Extract materials with voice";
  } else if (completedThrough === 1) {
    activeStep = 2;
    actionLabel = "Send Now";
    statusLabel = "Waiting for Price";
    statusTone = "waiting";
    nextActionText =
      "Next Action: Send material request to suppliers to get pricing";
  } else if (completedThrough === 2) {
    activeStep = 3;
    actionLabel = "Upload Prices";
    statusLabel = "Waiting for Price";
    statusTone = "waiting";
    nextActionText = quote.supplier_acknowledged_at
      ? "Supplier received the list. Next Action: Upload supplier pricing"
      : "Materials list sent. Waiting for supplier acknowledgment / pricing";
  } else if (completedThrough === 3) {
    activeStep = 4;
    actionLabel = "Create Quote";
    statusLabel = "Prices Uploaded";
    statusTone = "waiting";
    nextActionText = "Next Action: Create / finalize the customer quote";
  } else if (completedThrough === 4) {
    activeStep = 5;
    actionLabel = "Send Quote";
    statusLabel = "Quote Ready";
    statusTone = "sent";
    nextActionText = "Next Action: Send quote to customer";
  } else if (completedThrough === 5) {
    activeStep = 6;
    actionLabel = "Resend Quote";
    statusLabel = "Quote Sent";
    statusTone = "sent";
    nextActionText = "Waiting for customer to review and accept the quote";
  } else if (completedThrough === 6) {
    activeStep = 7;
    actionLabel = "Order Materials";
    statusLabel = "Customer Accepted";
    statusTone = "accepted";
    nextActionText =
      "Customer accepted the quote. Next step: Order materials from suppliers";
  } else if (completedThrough === 7) {
    activeStep = 8;
    if (orderConfirmed && !materialsReceived) {
      actionLabel = "Mark Received";
      statusLabel = "Order Confirmed";
      statusTone = "ready";
      nextActionText =
        "Supplier confirmed availability. Mark materials as received when they arrive.";
    } else {
      actionLabel = null;
      statusLabel = "Order Sent";
      statusTone = "ready";
      nextActionText = "Waiting for supplier to confirm materials availability";
    }
  } else if (completedThrough === 8) {
    activeStep = 9;
    actionLabel = "Set Start Date";
    statusLabel = "Materials Ready";
    statusTone = "ready";
    nextActionText = "Next Action: Schedule the project start date";
  } else if (completedThrough === 9) {
    activeStep = 10;
    actionLabel = "Start Project";
    statusLabel = "Ready to Start";
    statusTone = "start";
    nextActionText = "Next Action: Start the project";
  } else {
    activeStep = 10;
    actionLabel = null;
    statusLabel = "In Progress";
    statusTone = "start";
    nextActionText = "Project has been started";
  }

  const completedDates: Partial<Record<number, string | null>> = {
    1: hasMaterials ? shortDate(quote.created_at) : null,
    2: sentToSupplier
      ? shortDate(quote.updated_at) || shortDate(quote.created_at)
      : null,
    3: shortDate(quote.supplier_pricing_uploaded_at),
    4: shortDate(quote.quote_prepared_at) || shortDate(quote.sent_at),
    5: shortDate(quote.sent_at),
    6: shortDate(quote.confirmed_at),
    7: shortDate(latestOrder?.sent_at),
    8: shortDate(latestOrder?.materials_received_at),
    9: scheduled ? shortDate(project?.start_date) : null,
  };

  const title =
    project?.project_name?.trim() ||
    quote.project_name?.trim() ||
    quote.quote_number?.trim() ||
    "Untitled pre-invoice";

  return {
    id: project?.id || quote.id,
    projectId: project?.id ?? null,
    quoteId: quote.id,
    customerId: project?.customer_id ?? quote.customer_id ?? null,
    materialOrderId: latestOrder?.id ?? null,
    orderConfirmed: Boolean(orderConfirmed),
    materialsReceived,
    projectNumber: quote.quote_number?.trim() || `Q-${quote.id.slice(0, 6)}`,
    title,
    favorited: false,
    statusLabel,
    statusTone,
    customerName: quote.customer_name?.trim() || "No customer yet",
    address: "—",
    priceLabel: formatProjectMoney(Number(quote.grand_total) || 0),
    materialsCount: materialsCount(
      quote.materials ?? project?.materials ?? ([] as StoredMaterial[])
    ),
    createdLabel: formatProjectDate(quote.created_at),
    nextActionText,
    steps: buildSteps(completedThrough, activeStep, actionLabel, completedDates),
  };
}

export function buildPreInvoiceStats(cards: PreInvoiceProjectCard[]) {
  return [
    {
      id: "all",
      label: "All Pre-Invoices",
      count: cards.length,
      tone: "neutral" as const,
    },
    {
      id: "waiting",
      label: "Waiting for Price",
      count: cards.filter((card) => card.statusTone === "waiting").length,
      tone: "waiting" as const,
    },
    {
      id: "sent",
      label: "Quote Sent",
      count: cards.filter((card) => card.statusLabel === "Quote Sent").length,
      tone: "sent" as const,
    },
    {
      id: "accepted",
      label: "Customer Accepted",
      count: cards.filter((card) => card.statusTone === "accepted").length,
      tone: "accepted" as const,
    },
    {
      id: "ready_order",
      label: "Ready to Order",
      count: cards.filter(
        (card) =>
          card.statusTone === "accepted" || card.statusLabel === "Materials Ready"
      ).length,
      tone: "ready" as const,
    },
    {
      id: "ready_start",
      label: "Ready to Start",
      count: cards.filter((card) => card.statusTone === "start").length,
      tone: "start" as const,
    },
  ];
}
