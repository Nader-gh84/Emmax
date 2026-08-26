/**
 * Smoke: Project Process must use the same steps as the selected project card.
 * Run: npx tsx scripts/smoke-projects-process-sync.ts
 */
import {
  mapQuoteToPreInvoiceCard,
  PRE_INVOICE_WORKFLOW_STEPS,
  type ProjectWorkflowStep,
} from "../src/lib/pre-invoices";
import type { Quote } from "../src/types/quote";
import type { Project } from "../src/types/project";

/** Mirrors ProjectsProcessColumn.newProjectWorkflowSteps (keep in sync). */
function newProjectWorkflowSteps(): ProjectWorkflowStep[] {
  return PRE_INVOICE_WORKFLOW_STEPS.map((step) => ({
    id: step.id,
    state: step.number === 1 ? ("active" as const) : ("locked" as const),
    completedDate: null,
    actionLabel: step.number === 1 ? "Record" : null,
  }));
}

/** Mirrors pre-invoices-dashboard processSteps derivation. */
function resolveProcessSteps(
  selectedCard: ReturnType<typeof mapQuoteToPreInvoiceCard> | null
) {
  return selectedCard ? selectedCard.steps : newProjectWorkflowSteps();
}

/** Mirrors ProjectsProcessColumn step-by-id lookup (not index). */
function stepStateById(
  steps: ProjectWorkflowStep[]
): Record<string, string> {
  const map = new Map(steps.map((s) => [s.id, s]));
  const out: Record<string, string> = {};
  for (const def of PRE_INVOICE_WORKFLOW_STEPS) {
    out[def.id] = map.get(def.id)?.state ?? "missing";
  }
  return out;
}

const acceptedQuote = {
  id: "quote-accepted-1",
  user_id: "user-1",
  customer_id: "cust-1",
  customer_name: "Test Customer",
  customer_email: "test@example.com",
  customer_phone: null,
  project_name: "Kitchen Renovation",
  notes: null,
  materials: [
    {
      item: "Wire",
      quantity: 10,
      unit: "m",
      unitCost: 1,
      unitPrice: 1.2,
    },
  ],
  labour_items: [],
  tax_rate: 0,
  quote_number: "Q-2026-0001",
  validity_days: 30,
  subtotal: 12,
  tax: 0,
  grand_total: 12,
  status: "accepted",
  transcript: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-10T00:00:00.000Z",
  sent_at: "2026-01-08T00:00:00.000Z",
  pdf_url: "path/to.pdf",
  confirmation_token: "tok",
  confirmed_at: "2026-01-10T00:00:00.000Z",
  supplier_ack_token: "ack",
  supplier_acknowledged_at: "2026-01-03T00:00:00.000Z",
  supplier_pricing_uploaded_at: "2026-01-04T00:00:00.000Z",
  quote_prepared_at: "2026-01-05T00:00:00.000Z",
} as Quote;

const linkedProject = {
  id: "project-1",
  user_id: "user-1",
  quote_id: "quote-accepted-1",
  customer_id: "cust-1",
  project_name: "Kitchen Renovation",
  status: "planned",
  start_date: null,
  start_date_confirmed: false,
  materials: acceptedQuote.materials,
  created_at: "2026-01-10T00:00:00.000Z",
  updated_at: "2026-01-10T00:00:00.000Z",
} as unknown as Project;

const card = mapQuoteToPreInvoiceCard(acceptedQuote, linkedProject, null);

if (card.statusLabel !== "Customer Accepted") {
  throw new Error(`Expected Customer Accepted, got ${card.statusLabel}`);
}

const completed = card.steps.filter((s) => s.state === "completed").map((s) => s.id);
const active = card.steps.find((s) => s.state === "active");

if (completed.length !== 6) {
  throw new Error(
    `Expected 6 completed steps, got ${completed.length}: ${completed.join(",")}`
  );
}
if (active?.id !== "order_materials") {
  throw new Error(`Expected active order_materials, got ${active?.id}`);
}
if (active?.actionLabel !== "Order Materials") {
  throw new Error(`Expected Order Materials CTA, got ${active?.actionLabel}`);
}

const unselected = resolveProcessSteps(null);
const unselectedStates = stepStateById(unselected);
if (unselectedStates.voice_materials !== "active") {
  throw new Error("Unselected process should start at List Materials");
}
if (unselectedStates.order_materials !== "locked") {
  throw new Error("Unselected process must not show Order Materials as active");
}

const selectedSteps = resolveProcessSteps(card);
if (selectedSteps !== card.steps) {
  throw new Error("Selected process must reuse the card.steps reference");
}
const selectedStates = stepStateById(selectedSteps);
for (const def of PRE_INVOICE_WORKFLOW_STEPS) {
  const cardState = card.steps.find((s) => s.id === def.id)?.state;
  if (selectedStates[def.id] !== cardState) {
    throw new Error(
      `Process desync on ${def.id}: process=${selectedStates[def.id]} card=${cardState}`
    );
  }
}

if (selectedStates.voice_materials !== "completed") {
  throw new Error("Selected accepted project must show List Materials completed");
}
if (selectedStates.customer_accept !== "completed") {
  throw new Error("Selected accepted project must show Customer Accepts completed");
}
if (selectedStates.order_materials !== "active") {
  throw new Error("Selected accepted project must show Order Materials current");
}

console.log("smoke-projects-process-sync: OK", {
  statusLabel: card.statusLabel,
  active: active?.id,
  actionLabel: active?.actionLabel,
  completedCount: completed.length,
});
